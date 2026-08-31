using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Train> Trains => Set<Train>();
    public DbSet<Station> Stations => Set<Station>();
    public DbSet<TrainStop> TrainStops => Set<TrainStop>();

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
    }
}
