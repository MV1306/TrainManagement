using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class Train
{
    public int Id { get; set; }

    [Required, MaxLength(20)]
    public string TrainNumber { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Status { get; set; } = "active";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TrainStop> TrainStops { get; set; } = [];
}
