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
        var zone = p.Length > 10 ? NormaliseZone(p[10].Trim()) : null;

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

        return new ScrapeStopResult(order, code, name, arrival, departure, dist, lat, lng, string.IsNullOrEmpty(zone) ? null : zone);
    }

    // ── Bulk scrape ───────────────────────────────────────────────────────────
    [HttpPost("bulk")]
    public async Task<IActionResult> BulkScrape([FromBody] BulkScrapeRequest req)
    {
        if (req.Count is < 10 or > 100)
            return BadRequest(new { message = "Count must be between 10 and 100" });

        // Option 3: pre-load existing train numbers and station codes into memory
        var existingTrains = await db.Trains.Select(t => t.TrainNumber).ToHashSetAsync();
        var stationCache = await db.Stations.ToDictionaryAsync(s => s.Code, s => s);
        var zoneCache = await db.TrainZones.ToDictionaryAsync(z => z.Code.ToUpper(), z => z.Id);

        var trainNumbers = Enumerable.Range(req.StartSeries, req.Count).Select(n => n.ToString()).ToList();

        // Split into skipped (already in DB) vs to-fetch
        var toFetch = trainNumbers.Where(n => !existingTrains.Contains(n)).ToList();
        var results = trainNumbers
            .Where(n => existingTrains.Contains(n))
            .Select(n => new BulkScrapeItemResult(n, "skipped", Reason: "Already exists"))
            .ToList();

        // Option 1: fetch all train infos in parallel with a concurrency cap of 10
        var semaphore = new SemaphoreSlim(10);
        var infoTasks = toFetch.Select(async trainNo =>
        {
            await semaphore.WaitAsync();
            try { return (trainNo, await FetchTrainInfoAsync(trainNo)); }
            finally { semaphore.Release(); }
        });
        var infoResults = await Task.WhenAll(infoTasks);

        // Fetch stops in parallel for trains that resolved successfully
        var resolved = infoResults.Where(r => r.Item2.info is not null).ToList();
        var notFound = infoResults.Where(r => r.Item2.info is null)
            .Select(r => new BulkScrapeItemResult(r.trainNo, "notFound", Reason: r.Item2.error));
        results.AddRange(notFound);

        var stopTasks = resolved.Select(async r =>
        {
            await semaphore.WaitAsync();
            try { return (r.trainNo, r.Item2.info!, await FetchStopsAsync(r.Item2.info!.InternalId)); }
            finally { semaphore.Release(); }
        });
        var stopResults = await Task.WhenAll(stopTasks);

        // Option 2: batch all DB writes together
        foreach (var (trainNo, info, (stops, stopsErr)) in stopResults)
        {
            if (stops is null)
            {
                results.Add(new BulkScrapeItemResult(trainNo, "failed", info.TrainName, Reason: stopsErr));
                continue;
            }
            try
            {
                var zoneCode = stops.FirstOrDefault()?.Zone ?? info.ZoneCode;
                int? zoneId = zoneCode != null && zoneCache.TryGetValue(zoneCode.ToUpper(), out var zid) ? zid : null;
                var train = new Train { TrainNumber = trainNo, Name = info.TrainName, Type = "Express", Status = "active", RunningDays = info.RunningDays, ZoneId = zoneId };
                db.Trains.Add(train);
                await db.SaveChangesAsync(); // need Id before adding stops

                foreach (var stop in stops)
                {
                    var code = stop.Code.ToUpper();
                    if (!stationCache.TryGetValue(code, out var station))
                    {
                        station = new Station { Name = stop.Name, Code = code, City = stop.Name, Latitude = stop.Latitude, Longitude = stop.Longitude, ZoneId = stop.Zone != null && zoneCache.TryGetValue(stop.Zone.ToUpper(), out var szid) ? szid : null };
                        db.Stations.Add(station);
                        await db.SaveChangesAsync();
                        stationCache[code] = station;
                    }
                    db.TrainStops.Add(new TrainStop
                    {
                        TrainId = train.Id,
                        StationId = station.Id,
                        StopOrder = stop.StopOrder,
                        DistanceFromOrigin = stop.DistanceFromOrigin,
                        ArrivalTime = stop.ArrivalTime is not null ? TimeOnly.Parse(stop.ArrivalTime) : null,
                        DepartureTime = stop.DepartureTime is not null ? TimeOnly.Parse(stop.DepartureTime) : null,
                    });
                }
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

        var zoneCode = parts.Length > 53 ? NormaliseZone(parts[53].Trim()) : null;
        return (new ScrapeTrainResult(trainNo, trainName, internalId, runningDays, zoneCode), null);
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

    // erail uses codes like KRCL, CR, SCR — map to our DB codes
    private static readonly Dictionary<string, string> ZoneAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["KRCL"] = "KR", ["KONKAN"] = "KR",
        ["ECOR"] = "ECoR", ["METRO"] = "METRO",
    };

    private static string? NormaliseZone(string raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;
        return ZoneAliases.TryGetValue(raw, out var mapped) ? mapped : raw.ToUpper();
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
