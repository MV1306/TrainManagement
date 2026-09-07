using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainZones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ZoneId",
                table: "Trains",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TrainZones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Headquarters = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainZones", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "TrainZones",
                columns: new[] { "Id", "Code", "Headquarters", "Name" },
                values: new object[,]
                {
                    { 1, "CR", "Mumbai", "Central Railway" },
                    { 2, "ER", "Kolkata", "Eastern Railway" },
                    { 3, "ECR", "Hajipur", "East Central Railway" },
                    { 4, "ECoR", "Bhubaneswar", "East Coast Railway" },
                    { 5, "NR", "New Delhi", "Northern Railway" },
                    { 6, "NCR", "Prayagraj", "North Central Railway" },
                    { 7, "NER", "Gorakhpur", "North Eastern Railway" },
                    { 8, "NFR", "Guwahati", "Northeast Frontier Railway" },
                    { 9, "NWR", "Jaipur", "North Western Railway" },
                    { 10, "SR", "Chennai", "Southern Railway" },
                    { 11, "SCR", "Secunderabad", "South Central Railway" },
                    { 12, "SER", "Kolkata", "South Eastern Railway" },
                    { 13, "SECR", "Bilaspur", "South East Central Railway" },
                    { 14, "SWR", "Hubballi", "South Western Railway" },
                    { 15, "WR", "Mumbai", "Western Railway" },
                    { 16, "WCR", "Jabalpur", "West Central Railway" },
                    { 17, "KR", "Navi Mumbai", "Konkan Railway" },
                    { 18, "METRO", "Kolkata", "Kolkata Metro Railway" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Trains_ZoneId",
                table: "Trains",
                column: "ZoneId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainZones_Code",
                table: "TrainZones",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Trains_TrainZones_ZoneId",
                table: "Trains",
                column: "ZoneId",
                principalTable: "TrainZones",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trains_TrainZones_ZoneId",
                table: "Trains");

            migrationBuilder.DropTable(
                name: "TrainZones");

            migrationBuilder.DropIndex(
                name: "IX_Trains_ZoneId",
                table: "Trains");

            migrationBuilder.DropColumn(
                name: "ZoneId",
                table: "Trains");
        }
    }
}
