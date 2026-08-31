using api.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Net;

namespace api.Controllers;

[ApiController]
[Route("api/scrape")]
public class ScrapeController(IHttpClientFactory httpFactory) : ControllerBase
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

        // Internal ID is a 4-5 digit number — scan all tokens
        // var internalId = parts
        //     .Select(p => p.Trim())
        //     .FirstOrDefault(p => int.TryParse(p, out var n) && n >= 1000 && n <= 99999) ?? "";

        if (string.IsNullOrEmpty(internalId))
            return UnprocessableEntity(new { message = "Could not extract internal train ID" });

        return Ok(new ScrapeTrainResult(trainNo, trainName, internalId));
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
