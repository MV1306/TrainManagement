using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyToTrainStops : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RouteStations");

            migrationBuilder.DropTable(
                name: "Routes");

            migrationBuilder.CreateTable(
                name: "TrainStops",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrainId = table.Column<int>(type: "integer", nullable: false),
                    StationId = table.Column<int>(type: "integer", nullable: false),
                    StopOrder = table.Column<int>(type: "integer", nullable: false),
                    DistanceFromOrigin = table.Column<decimal>(type: "numeric", nullable: false),
                    ArrivalTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    DepartureTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainStops", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrainStops_Stations_StationId",
                        column: x => x.StationId,
                        principalTable: "Stations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainStops_Trains_TrainId",
                        column: x => x.TrainId,
                        principalTable: "Trains",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TrainStops_StationId",
                table: "TrainStops",
                column: "StationId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainStops_TrainId",
                table: "TrainStops",
                column: "TrainId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TrainStops");

            migrationBuilder.CreateTable(
                name: "Routes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrainId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Routes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Routes_Trains_TrainId",
                        column: x => x.TrainId,
                        principalTable: "Trains",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RouteStations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RouteId = table.Column<int>(type: "integer", nullable: false),
                    StationId = table.Column<int>(type: "integer", nullable: false),
                    ArrivalTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    DepartureTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    DistanceFromOrigin = table.Column<decimal>(type: "numeric", nullable: false),
                    StopOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteStations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RouteStations_Routes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "Routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RouteStations_Stations_StationId",
                        column: x => x.StationId,
                        principalTable: "Stations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Routes_TrainId",
                table: "Routes",
                column: "TrainId");

            migrationBuilder.CreateIndex(
                name: "IX_RouteStations_RouteId",
                table: "RouteStations",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_RouteStations_StationId",
                table: "RouteStations",
                column: "StationId");
        }
    }
}
