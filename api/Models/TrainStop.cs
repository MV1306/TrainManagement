namespace api.Models;

public class TrainStop
{
    public int Id { get; set; }

    public int TrainId { get; set; }
    public Train Train { get; set; } = null!;

    public int StationId { get; set; }
    public Station Station { get; set; } = null!;

    public int StopOrder { get; set; }
    public decimal DistanceFromOrigin { get; set; }
    public TimeOnly? ArrivalTime { get; set; }
    public TimeOnly? DepartureTime { get; set; }
}
