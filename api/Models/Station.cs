using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class Station
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(10)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string City { get; set; } = string.Empty;

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TrainStop> TrainStops { get; set; } = [];
}
