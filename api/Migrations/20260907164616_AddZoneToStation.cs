using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddZoneToStation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ZoneId",
                table: "Stations",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Stations_ZoneId",
                table: "Stations",
                column: "ZoneId");

            migrationBuilder.AddForeignKey(
                name: "FK_Stations_TrainZones_ZoneId",
                table: "Stations",
                column: "ZoneId",
                principalTable: "TrainZones",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Stations_TrainZones_ZoneId",
                table: "Stations");

            migrationBuilder.DropIndex(
                name: "IX_Stations_ZoneId",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "ZoneId",
                table: "Stations");
        }
    }
}
