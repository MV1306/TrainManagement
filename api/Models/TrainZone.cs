using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class TrainZone
{
    public int Id { get; set; }

    [Required, MaxLength(10)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Headquarters { get; set; } = string.Empty;

    public ICollection<Train> Trains { get; set; } = [];
}
