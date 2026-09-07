using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Train> Trains => Set<Train>();
    public DbSet<Station> Stations => Set<Station>();
    public DbSet<TrainStop> TrainStops => Set<TrainStop>();
    public DbSet<TrainZone> TrainZones => Set<TrainZone>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Train>()
            .HasIndex(t => t.TrainNumber).IsUnique();

        modelBuilder.Entity<Station>()
            .HasIndex(s => s.Code).IsUnique();

        modelBuilder.Entity<TrainStop>()
            .HasOne(ts => ts.Train)
            .WithMany(t => t.TrainStops)
            .HasForeignKey(ts => ts.TrainId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TrainStop>()
            .HasOne(ts => ts.Station)
            .WithMany(s => s.TrainStops)
            .HasForeignKey(ts => ts.StationId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Train>()
            .HasOne(t => t.Zone)
            .WithMany(z => z.Trains)
            .HasForeignKey(t => t.ZoneId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TrainZone>()
            .HasIndex(z => z.Code).IsUnique();

        modelBuilder.Entity<TrainZone>().HasData(
            new TrainZone { Id = 1,  Code = "CR",    Name = "Central Railway",              Headquarters = "Mumbai" },
            new TrainZone { Id = 2,  Code = "ER",    Name = "Eastern Railway",              Headquarters = "Kolkata" },
            new TrainZone { Id = 3,  Code = "ECR",   Name = "East Central Railway",         Headquarters = "Hajipur" },
            new TrainZone { Id = 4,  Code = "ECoR",  Name = "East Coast Railway",           Headquarters = "Bhubaneswar" },
            new TrainZone { Id = 5,  Code = "NR",    Name = "Northern Railway",             Headquarters = "New Delhi" },
            new TrainZone { Id = 6,  Code = "NCR",   Name = "North Central Railway",        Headquarters = "Prayagraj" },
            new TrainZone { Id = 7,  Code = "NER",   Name = "North Eastern Railway",        Headquarters = "Gorakhpur" },
            new TrainZone { Id = 8,  Code = "NFR",   Name = "Northeast Frontier Railway",   Headquarters = "Guwahati" },
            new TrainZone { Id = 9,  Code = "NWR",   Name = "North Western Railway",        Headquarters = "Jaipur" },
            new TrainZone { Id = 10, Code = "SR",    Name = "Southern Railway",             Headquarters = "Chennai" },
            new TrainZone { Id = 11, Code = "SCR",   Name = "South Central Railway",        Headquarters = "Secunderabad" },
            new TrainZone { Id = 12, Code = "SER",   Name = "South Eastern Railway",        Headquarters = "Kolkata" },
            new TrainZone { Id = 13, Code = "SECR",  Name = "South East Central Railway",   Headquarters = "Bilaspur" },
            new TrainZone { Id = 14, Code = "SWR",   Name = "South Western Railway",        Headquarters = "Hubballi" },
            new TrainZone { Id = 15, Code = "WR",    Name = "Western Railway",              Headquarters = "Mumbai" },
            new TrainZone { Id = 16, Code = "WCR",   Name = "West Central Railway",         Headquarters = "Jabalpur" },
            new TrainZone { Id = 17, Code = "KR",    Name = "Konkan Railway",               Headquarters = "Navi Mumbai" },
            new TrainZone { Id = 18, Code = "METRO", Name = "Kolkata Metro Railway",        Headquarters = "Kolkata" }
        );
    }
}
