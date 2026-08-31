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
            .Select(t => new TrainDto(t.Id, t.TrainNumber, t.Name, t.Type, t.Status, t.CreatedAt)));

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
        };
        db.Trains.Add(train);
        await db.SaveChangesAsync();
        SetStops(train.Id, req.Stops);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = train.Id },
            new TrainDto(train.Id, train.TrainNumber, train.Name, train.Type, train.Status, train.CreatedAt));
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

        db.TrainStops.RemoveRange(db.TrainStops.Where(ts => ts.TrainId == id));
        SetStops(id, req.Stops);
        await db.SaveChangesAsync();
        return Ok(new TrainDto(train.Id, train.TrainNumber, train.Name, train.Type, train.Status, train.CreatedAt));
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
        new(train.Id, train.TrainNumber, train.Name, train.Type, train.Status, train.CreatedAt,
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
