namespace api.DTOs;

public record TrainStopDto(int Id, int StationId, string StationName, string Code, int StopOrder, decimal DistanceFromOrigin, string? ArrivalTime, string? DepartureTime, double? Latitude, double? Longitude, int? HaltMinutes);
public record TrainStopRequest(int StationId, int StopOrder, decimal DistanceFromOrigin, string? ArrivalTime, string? DepartureTime);

public record TrainDto(int Id, string TrainNumber, string Name, string Type, string Status, int RunningDays, DateTime CreatedAt, int? ZoneId, string? ZoneCode, string? ZoneName);
public record TrainDetailDto(int Id, string TrainNumber, string Name, string Type, string Status, int RunningDays, DateTime CreatedAt, List<TrainStopDto> Stops, string? JourneyDuration, int TotalStops, int? ZoneId, string? ZoneCode, string? ZoneName);
public record TrainRequest(string TrainNumber, string Name, string Type, string Status, int RunningDays, int? ZoneId, List<TrainStopRequest> Stops);

public record CoverageStopDto(int StationId, string StationName, string Code, double? Latitude, double? Longitude, decimal DistanceFromOrigin);
public record TrainCoverageDto(int Id, string TrainNumber, string Name, string Type, string Status, List<CoverageStopDto> Stops);

public record StationDto(int Id, string Name, string Code, string City, double? Latitude, double? Longitude, DateTime CreatedAt, int? ZoneId = null, string? ZoneCode = null, string? ZoneName = null, string? Division = null);
public record StationRequest(string Name, string Code, string City, double? Latitude, double? Longitude, int? ZoneId = null, string? Division = null);

public record TrainZoneDto(int Id, string Code, string Name, string Headquarters);

// Scrape DTOs
public record ScrapeTrainResult(string TrainNumber, string TrainName, string InternalId, int RunningDays, string? ZoneCode = null);
public record ScrapeStopResult(int StopOrder, string Code, string Name, string? ArrivalTime, string? DepartureTime, int DistanceFromOrigin, double? Latitude, double? Longitude, string? Zone = null, string? Division = null);
public record BulkScrapeRequest(int StartSeries, int Count);
public record BulkScrapeItemResult(string TrainNumber, string Status, string? TrainName = null, string? Reason = null);
public record BulkScrapeResult(List<BulkScrapeItemResult> Results);
