using api.Data;
using api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/zones")]
public class ZonesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok((await db.TrainZones.OrderBy(z => z.Code).ToListAsync())
            .Select(z => new TrainZoneDto(z.Id, z.Code, z.Name, z.Headquarters)));
}
