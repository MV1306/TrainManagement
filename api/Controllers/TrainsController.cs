using api.Data;
using api.DTOs;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/trains")]
public class TrainsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok((await db.Trains.OrderBy(t => t.Id).ToListAsync())
            .Select(t => new TrainDto(t.Id, t.TrainNumber, t.Name, t.Type, t.Status, t.RunningDays, t.CreatedAt)));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var train = await db.Trains
            .Include(t => t.TrainStops).ThenInclude(ts => ts.Station)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (train is null) return NotFound();
        return Ok(MapDetail(train));
    }

    [HttpPost]
    public async Task<IActionResult> Create(TrainRequest req)
    {
        var train = new Train
        {
            TrainNumber = req.TrainNumber,
            Name = req.Name,
            Type = req.Type,
            Status = req.Status,
            RunningDays = req.RunningDays,
        };
        db.Trains.Add(train);
        await db.SaveChangesAsync();
        SetStops(train.Id, req.Stops);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = train.Id },
            new TrainDto(train.Id, train.TrainNumber, train.Name, train.Type, train.Status, train.RunningDays, train.CreatedAt));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, TrainRequest req)
    {
        var train = await db.Trains.FindAsync(id);
        if (train is null) return NotFound();

        train.TrainNumber = req.TrainNumber;
        train.Name = req.Name;
        train.Type = req.Type;
        train.Status = req.Status;
        train.RunningDays = req.RunningDays;

        db.TrainStops.RemoveRange(db.TrainStops.Where(ts => ts.TrainId == id));
        SetStops(id, req.Stops);
        await db.SaveChangesAsync();
        return Ok(new TrainDto(train.Id, train.TrainNumber, train.Name, train.Type, train.Status, train.RunningDays, train.CreatedAt));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var train = await db.Trains.FindAsync(id);
        if (train is null) return NotFound();
        db.Trains.Remove(train);
        await db.SaveChangesAsync();
        return Ok(new { message = "Train deleted" });
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var train = await db.Trains.FindAsync(id);
        if (train is null) return NotFound();
        train.Status = train.Status == "active" ? "inactive" : "active";
        await db.SaveChangesAsync();
        return Ok(new TrainDto(train.Id, train.TrainNumber, train.Name, train.Type, train.Status, train.RunningDays, train.CreatedAt));
    }

    [HttpPost("{id}/duplicate")]
    public async Task<IActionResult> Duplicate(int id)
    {
        var src = await db.Trains
            .Include(t => t.TrainStops)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (src is null) return NotFound();

        var copy = new Train
        {
            TrainNumber = src.TrainNumber + "-COPY",
            Name = src.Name + " (Copy)",
            Type = src.Type,
            Status = "inactive",
            RunningDays = src.RunningDays,
        };
        db.Trains.Add(copy);
        await db.SaveChangesAsync();
        SetStops(copy.Id, src.TrainStops.OrderBy(s => s.StopOrder).Select(s => new TrainStopRequest(
            s.StationId, s.StopOrder, s.DistanceFromOrigin,
            s.ArrivalTime?.ToString("HH:mm"),
            s.DepartureTime?.ToString("HH:mm"))).ToList());
        await db.SaveChangesAsync();
        return Ok(new TrainDto(copy.Id, copy.TrainNumber, copy.Name, copy.Type, copy.Status, copy.RunningDays, copy.CreatedAt));
    }

    private void SetStops(int trainId, List<TrainStopRequest> stops)
    {
        foreach (var s in stops)
            db.TrainStops.Add(new TrainStop
            {
                TrainId = trainId,
                StationId = s.StationId,
                StopOrder = s.StopOrder,
                DistanceFromOrigin = s.DistanceFromOrigin,
                ArrivalTime = s.ArrivalTime is not null ? TimeOnly.Parse(s.ArrivalTime) : null,
                DepartureTime = s.DepartureTime is not null ? TimeOnly.Parse(s.DepartureTime) : null,
            });
    }

    private static TrainDetailDto MapDetail(Train train) =>
        new(train.Id, train.TrainNumber, train.Name, train.Type, train.Status, train.RunningDays, train.CreatedAt,
            train.TrainStops.OrderBy(ts => ts.StopOrder)
                .Select(ts => new TrainStopDto(
                    ts.Id, ts.StationId, ts.Station.Name, ts.Station.Code,
                    ts.StopOrder, ts.DistanceFromOrigin,
                    ts.ArrivalTime?.ToString("HH:mm"),
                    ts.DepartureTime?.ToString("HH:mm"),
                    ts.Station.Latitude,
                    ts.Station.Longitude))
                .ToList());
}
