using api.Data;
using api.DTOs;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Net;

namespace api.Controllers;

[ApiController]
[Route("api/scrape")]
public class ScrapeController(IHttpClientFactory httpFactory, AppDbContext db) : ControllerBase
{
    // ── Step 1: resolve train number → internal ID ───────────────────────────
    [HttpGet("train/{trainNo}")]
    public async Task<IActionResult> GetTrainInfo(string trainNo)
    {
        var client = httpFactory.CreateClient("erail");
        var url =
            $"https://erail.in/rail/getTrains.aspx?TrainNo={trainNo}&DataSource=0&Language=0&Cache=true";

        string raw;
        try
        {
            raw = await client.GetStringAsync(url);
        }
        catch
        {
            return StatusCode(502, new { message = "Failed to reach erail API" });
        }

        var trainBlock = raw.Split('^').FirstOrDefault(b => b.TrimStart().StartsWith(trainNo));
        if (trainBlock is null)
            return NotFound(new { message = $"Train {trainNo} not found on erail" });

        var parts = trainBlock.Split('~');
        var trainName = parts.Length > 1 ? parts[1] : "";
        var internalId = parts.Length > 33 ? parts[33] : "";

        // Find the 7-char day pattern like "1111111" or "1010101" (Mon-Sun)
        var runningDays = 127; // default: daily
        var dayPart = parts.FirstOrDefault(p => p.Length == 7 && p.All(c => c == '0' || c == '1'));
        if (dayPart != null)
        {
            runningDays = 0;
            for (int i = 0; i < 7; i++)
                if (dayPart[i] == '1') runningDays |= (1 << i);
        }

        // Internal ID is a 4-5 digit number — scan all tokens
        // var internalId = parts
        //     .Select(p => p.Trim())
        //     .FirstOrDefault(p => int.TryParse(p, out var n) && n >= 1000 && n <= 99999) ?? "";

        if (string.IsNullOrEmpty(internalId))
            return UnprocessableEntity(new { message = "Could not extract internal train ID" });

        return Ok(new ScrapeTrainResult(trainNo, trainName, internalId, runningDays));
    }

    // ── Step 2: fetch stops using internal ID ────────────────────────────────
    [HttpGet("stops/{internalId}")]
    public async Task<IActionResult> GetStops(string internalId)
    {
        var client = httpFactory.CreateClient("erail");
        var url =
            $"https://erail.in/data.aspx?Action=TRAINROUTE&Password=2012&Data1={internalId}&Data2=0&Cache=true";

        string raw;
        try
        {
            raw = await client.GetStringAsync(url);
        }
        catch
        {
            return StatusCode(502, new { message = "Failed to reach erail API" });
        }

        // Find the first occurrence of ^{digit} — that marks the start of stop data
        var stopStart = -1;
        for (int i = 0; i < raw.Length - 1; i++)
        {
            if (raw[i] == '^' && char.IsDigit(raw[i + 1]))
            {
                stopStart = i;
                break;
            }
        }

        if (stopStart < 0)
            return UnprocessableEntity(new { message = "Could not locate stop data in response" });

        var stopSection = raw[stopStart..];

        var stops = stopSection
            .Split('^', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(ParseStop)
            .Where(s => s is not null)
            .ToList();

        if (stops.Count == 0)
            return UnprocessableEntity(new { message = "Could not parse any stops from response" });

        return Ok(stops);
    }

    // ── Parser ────────────────────────────────────────────────────────────────
    // Stop line format (^ stripped, fields split by ~):
    // 0=order, 1=code, 2=englishName, 3=arrival, 4=departure, 5=haltMins,
    // 6=distanceFromOrigin, 7=dayCount, 8=?, 9=dayCount2, 10=?, 11=zone,
    // 12=div, 13=hindiName(HTML encoded), 14=RL_or_empty, 15=lat, 16=lng,
    // 17=arrDist, 18=depDist
    private static ScrapeStopResult? ParseStop(string line)
    {
        var p = line.Split('~');
        if (p.Length < 7)
            return null;
        if (!int.TryParse(p[0].Trim(), out var order))
            return null;

        var code = p[1].Trim();
        var name = WebUtility.HtmlDecode(p[2].Trim());
        var arrival = NormaliseTime(p[3]);
        var departure = NormaliseTime(p[4]);
        int.TryParse(p[6].Trim(), out var dist);

        // Scan from index 13 onward for two consecutive values that are
        // valid Indian coordinates: lat in [6, 38], lng in [68, 98]
        double? lat = null,
            lng = null;
        for (int i = 13; i < p.Length - 1; i++)
        {
            if (
                double.TryParse(
                    p[i].Trim(),
                    NumberStyles.Float,
                    CultureInfo.InvariantCulture,
                    out var a
                )
                && double.TryParse(
                    p[i + 1].Trim(),
                    NumberStyles.Float,
                    CultureInfo.InvariantCulture,
                    out var b
                )
                && a is >= 6 and <= 38
                && b is >= 68 and <= 98
            )
            {
                lat = a;
                lng = b;
                break;
            }
        }

        return new ScrapeStopResult(order, code, name, arrival, departure, dist, lat, lng);
    }

    // ── Bulk scrape ───────────────────────────────────────────────────────────
    [HttpPost("bulk")]
    public async Task<IActionResult> BulkScrape([FromBody] BulkScrapeRequest req)
    {
        if (req.Count is < 10 or > 100)
            return BadRequest(new { message = "Count must be between 10 and 100" });

        var results = new List<BulkScrapeItemResult>();

        for (int i = 0; i < req.Count; i++)
        {
            var trainNo = (req.StartSeries + i).ToString();

            if (await db.Trains.AnyAsync(t => t.TrainNumber == trainNo))
            {
                results.Add(new BulkScrapeItemResult(trainNo, "skipped", Reason: "Already exists"));
                continue;
            }

            // Resolve train info
            var (info, infoErr) = await FetchTrainInfoAsync(trainNo);
            if (info is null)
            {
                results.Add(new BulkScrapeItemResult(trainNo, "notFound", Reason: infoErr));
                continue;
            }

            // Fetch stops
            var (stops, stopsErr) = await FetchStopsAsync(info.InternalId);
            if (stops is null)
            {
                results.Add(new BulkScrapeItemResult(trainNo, "failed", info.TrainName, Reason: stopsErr));
                continue;
            }

            // Upsert stations + create train
            try
            {
                var stopsWithIds = new List<TrainStop>();
                foreach (var stop in stops)
                {
                    var code = stop.Code.ToUpper();
                    var station = await db.Stations.FirstOrDefaultAsync(s => s.Code == code);
                    if (station is null)
                    {
                        station = new Station { Name = stop.Name, Code = code, City = stop.Name, Latitude = stop.Latitude, Longitude = stop.Longitude };
                        db.Stations.Add(station);
                        await db.SaveChangesAsync();
                    }
                    stopsWithIds.Add(new TrainStop
                    {
                        StationId = station.Id,
                        StopOrder = stop.StopOrder,
                        DistanceFromOrigin = stop.DistanceFromOrigin,
                        ArrivalTime = stop.ArrivalTime is not null ? TimeOnly.Parse(stop.ArrivalTime) : null,
                        DepartureTime = stop.DepartureTime is not null ? TimeOnly.Parse(stop.DepartureTime) : null,
                    });
                }

                var train = new Train { TrainNumber = trainNo, Name = info.TrainName, Type = "Express", Status = "active", RunningDays = info.RunningDays };
                db.Trains.Add(train);
                await db.SaveChangesAsync();
                foreach (var s in stopsWithIds) { s.TrainId = train.Id; db.TrainStops.Add(s); }
                await db.SaveChangesAsync();

                results.Add(new BulkScrapeItemResult(trainNo, "imported", info.TrainName));
            }
            catch (Exception ex)
            {
                results.Add(new BulkScrapeItemResult(trainNo, "failed", info.TrainName, Reason: ex.Message));
            }
        }

        return Ok(new BulkScrapeResult(results));
    }

    private async Task<(ScrapeTrainResult? info, string? error)> FetchTrainInfoAsync(string trainNo)
    {
        var client = httpFactory.CreateClient("erail");
        string raw;
        try { raw = await client.GetStringAsync($"https://erail.in/rail/getTrains.aspx?TrainNo={trainNo}&DataSource=0&Language=0&Cache=true"); }
        catch { return (null, "Failed to reach erail API"); }

        var trainBlock = raw.Split('^').FirstOrDefault(b => b.TrimStart().StartsWith(trainNo));
        if (trainBlock is null) return (null, $"Train {trainNo} not found on erail");

        var parts = trainBlock.Split('~');
        var trainName = parts.Length > 1 ? parts[1] : "";
        var internalId = parts.Length > 33 ? parts[33] : "";
        if (string.IsNullOrEmpty(internalId)) return (null, "Could not extract internal train ID");

        var runningDays = 127;
        var dayPart = parts.FirstOrDefault(p => p.Length == 7 && p.All(c => c == '0' || c == '1'));
        if (dayPart != null) { runningDays = 0; for (int i = 0; i < 7; i++) if (dayPart[i] == '1') runningDays |= (1 << i); }

        return (new ScrapeTrainResult(trainNo, trainName, internalId, runningDays), null);
    }

    private async Task<(List<ScrapeStopResult>? stops, string? error)> FetchStopsAsync(string internalId)
    {
        var client = httpFactory.CreateClient("erail");
        string raw;
        try { raw = await client.GetStringAsync($"https://erail.in/data.aspx?Action=TRAINROUTE&Password=2012&Data1={internalId}&Data2=0&Cache=true"); }
        catch { return (null, "Failed to reach erail API"); }

        var stopStart = -1;
        for (int i = 0; i < raw.Length - 1; i++)
            if (raw[i] == '^' && char.IsDigit(raw[i + 1])) { stopStart = i; break; }

        if (stopStart < 0) return (null, "Could not locate stop data in response");

        var stops = raw[stopStart..]
            .Split('^', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(ParseStop).Where(s => s is not null).Cast<ScrapeStopResult>().ToList();

        return stops.Count == 0 ? (null, "Could not parse any stops") : (stops, null);
    }

    private static string? NormaliseTime(string raw)
    {
        var t = raw.Trim();
        if (t is "First" or "Last" or "")
            return null;
        // Convert 23.15 → 23:15
        if (t.Length == 5 && t[2] == '.')
            return t[..2] + ":" + t[3..];
        if (t.Length == 5 && t[2] == ':')
            return t;
        return null;
    }
}
