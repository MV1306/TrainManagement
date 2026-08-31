namespace api.DTOs;

public record TrainStopDto(int Id, int StationId, string StationName, string Code, int StopOrder, decimal DistanceFromOrigin, string? ArrivalTime, string? DepartureTime, double? Latitude, double? Longitude);
public record TrainStopRequest(int StationId, int StopOrder, decimal DistanceFromOrigin, string? ArrivalTime, string? DepartureTime);

public record TrainDto(int Id, string TrainNumber, string Name, string Type, string Status, int RunningDays, DateTime CreatedAt);
public record TrainDetailDto(int Id, string TrainNumber, string Name, string Type, string Status, int RunningDays, DateTime CreatedAt, List<TrainStopDto> Stops);
public record TrainRequest(string TrainNumber, string Name, string Type, string Status, int RunningDays, List<TrainStopRequest> Stops);

public record StationDto(int Id, string Name, string Code, string City, double? Latitude, double? Longitude, DateTime CreatedAt);
public record StationRequest(string Name, string Code, string City, double? Latitude, double? Longitude);

// Scrape DTOs
public record ScrapeTrainResult(string TrainNumber, string TrainName, string InternalId, int RunningDays);
public record ScrapeStopResult(int StopOrder, string Code, string Name, string? ArrivalTime, string? DepartureTime, int DistanceFromOrigin, double? Latitude, double? Longitude);
