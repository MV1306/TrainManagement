using api.Data;
using api.DTOs;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/stations")]
public class StationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok((await db.Stations.OrderBy(s => s.Id).ToListAsync())
            .Select(s => new StationDto(s.Id, s.Name, s.Code, s.City, s.Latitude, s.Longitude, s.CreatedAt)));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var s = await db.Stations.FindAsync(id);
        return s is null ? NotFound() : Ok(new StationDto(s.Id, s.Name, s.Code, s.City, s.Latitude, s.Longitude, s.CreatedAt));
    }

    [HttpPost]
    public async Task<IActionResult> Create(StationRequest req)
    {
        var station = new Station
        {
            Name = req.Name,
            Code = req.Code.ToUpper(),
            City = req.City,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
        };
        db.Stations.Add(station);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = station.Id },
            new StationDto(station.Id, station.Name, station.Code, station.City, station.Latitude, station.Longitude, station.CreatedAt));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, StationRequest req)
    {
        var station = await db.Stations.FindAsync(id);
        if (station is null) return NotFound();
        station.Name = req.Name;
        station.Code = req.Code.ToUpper();
        station.City = req.City;
        station.Latitude = req.Latitude;
        station.Longitude = req.Longitude;
        await db.SaveChangesAsync();
        return Ok(new StationDto(station.Id, station.Name, station.Code, station.City, station.Latitude, station.Longitude, station.CreatedAt));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var station = await db.Stations.FindAsync(id);
        if (station is null) return NotFound();

        var usedBy = await db.TrainStops.AnyAsync(ts => ts.StationId == id);
        if (usedBy)
            return Conflict(new { message = "Station is assigned to one or more train routes and cannot be deleted." });

        db.Stations.Remove(station);
        await db.SaveChangesAsync();
        return Ok(new { message = "Station deleted" });
    }
}
