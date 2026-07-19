require("dotenv/config");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../app/generated/prisma");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main() {
  console.log("Clearing existing data...");
  await prisma.activityLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.note.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.traveler.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating users...");
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Sophia Reyes",
      email: "admin@aeriahub.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  const agentMarcus = await prisma.user.create({
    data: {
      name: "Marcus Chen",
      email: "marcus@aeriahub.com",
      passwordHash,
      role: "AGENT",
    },
  });

  const agentPriya = await prisma.user.create({
    data: {
      name: "Priya Nair",
      email: "priya@aeriahub.com",
      passwordHash,
      role: "AGENT",
    },
  });

  const agents = [agentMarcus, agentPriya];

  console.log("Creating clients...");
  const clientSeeds = [
    {
      firstName: "Elena",
      lastName: "Marquez",
      email: "elena.marquez@example.com",
      phone: "+1-415-555-0182",
      address: "482 Ocean Ave",
      city: "San Francisco",
      country: "United States",
      dateOfBirth: "1985-03-14",
      passportNumber: "US4821903",
      passportExpiry: "2027-06-01",
      nationality: "United States",
      travelPreferences: "Window seat, boutique hotels, prefers direct flights when possible.",
      loyaltyPrograms: "United MileagePlus #UA88213, Marriott Bonvoy #MB55210",
      dietaryNotes: "Vegetarian",
      mobilityNotes: null,
      status: "active",
      travelers: [
        { firstName: "David", lastName: "Marquez", relationshipToClient: "Spouse", dateOfBirth: "1983-11-02", nationality: "United States" },
        { firstName: "Lucia", lastName: "Marquez", relationshipToClient: "Child", dateOfBirth: "2015-06-20", nationality: "United States" },
      ],
    },
    {
      firstName: "James",
      lastName: "Whitfield",
      email: "j.whitfield@example.com",
      phone: "+44-20-7946-0958",
      address: "12 Baker Street",
      city: "London",
      country: "United Kingdom",
      dateOfBirth: "1978-07-22",
      passportNumber: "GB7729014",
      passportExpiry: "2026-09-15",
      nationality: "United Kingdom",
      travelPreferences: "Aisle seat, loves history tours",
      loyaltyPrograms: "British Airways Executive Club #BA10293",
      dietaryNotes: null,
      mobilityNotes: null,
      status: "active",
      travelers: [
        { firstName: "Charlotte", lastName: "Whitfield", relationshipToClient: "Spouse", dateOfBirth: "1980-02-18", nationality: "United Kingdom" },
        { firstName: "Oliver", lastName: "Whitfield", relationshipToClient: "Child", dateOfBirth: "2012-05-09", nationality: "United Kingdom" },
      ],
    },
    {
      firstName: "Aiko",
      lastName: "Tanaka",
      email: "aiko.tanaka@example.com",
      phone: "+81-3-4567-8901",
      address: "3-2-1 Shibuya",
      city: "Tokyo",
      country: "Japan",
      dateOfBirth: "1990-01-30",
      passportNumber: "JP0192837",
      passportExpiry: "2025-12-20",
      nationality: "Japan",
      travelPreferences: "Prefers ryokan stays, minimal layovers",
      loyaltyPrograms: "ANA Mileage Club #ANA33210",
      dietaryNotes: "No shellfish",
      mobilityNotes: null,
      status: "active",
      travelers: [{ firstName: "Kenji", lastName: "Sato", relationshipToClient: "Companion", dateOfBirth: "1989-05-15", nationality: "Japan" }],
    },
    {
      firstName: "Carlos",
      lastName: "Fernandez",
      email: "carlos.fernandez@example.com",
      phone: "+34-91-123-4567",
      address: "Calle Mayor 45",
      city: "Madrid",
      country: "Spain",
      dateOfBirth: "1975-09-08",
      passportNumber: "ES5540219",
      passportExpiry: "2026-03-11",
      nationality: "Spain",
      travelPreferences: "Family-friendly resorts, all-inclusive",
      loyaltyPrograms: null,
      dietaryNotes: null,
      mobilityNotes: null,
      status: "active",
      travelers: [
        { firstName: "Isabel", lastName: "Fernandez", relationshipToClient: "Spouse", dateOfBirth: "1977-04-25", nationality: "Spain" },
        { firstName: "Mateo", lastName: "Fernandez", relationshipToClient: "Child", dateOfBirth: "2010-08-14", nationality: "Spain" },
        { firstName: "Sofia", lastName: "Fernandez", relationshipToClient: "Child", dateOfBirth: "2014-01-19", nationality: "Spain" },
      ],
    },
    {
      firstName: "Grace",
      lastName: "Okafor",
      email: "grace.okafor@example.com",
      phone: "+234-1-555-0192",
      address: "15 Victoria Island Rd",
      city: "Lagos",
      country: "Nigeria",
      dateOfBirth: "1988-06-11",
      passportNumber: "NG2093841",
      passportExpiry: "2028-01-05",
      nationality: "Nigeria",
      travelPreferences: "Business class preferred, loyalty to Star Alliance",
      loyaltyPrograms: "Lufthansa Miles & More #LH99201",
      dietaryNotes: null,
      mobilityNotes: null,
      status: "active",
      travelers: [{ firstName: "Emeka", lastName: "Okafor", relationshipToClient: "Sibling", dateOfBirth: "1991-10-03", nationality: "Nigeria" }],
    },
    {
      firstName: "Liam",
      lastName: "O'Connor",
      email: "liam.oconnor@example.com",
      phone: "+353-1-555-0143",
      address: "22 Grafton Street",
      city: "Dublin",
      country: "Ireland",
      dateOfBirth: "1992-12-05",
      passportNumber: "IE1029384",
      passportExpiry: "2025-10-28",
      nationality: "Ireland",
      travelPreferences: "Adventure travel, hiking trips",
      loyaltyPrograms: null,
      dietaryNotes: "Gluten-free",
      mobilityNotes: null,
      status: "active",
      travelers: [{ firstName: "Sean", lastName: "Byrne", relationshipToClient: "Companion", dateOfBirth: "1991-08-08", nationality: "Ireland" }],
    },
    {
      firstName: "Mei",
      lastName: "Lin",
      email: "mei.lin@example.com",
      phone: "+65-6555-0198",
      address: "10 Marina Bay",
      city: "Singapore",
      country: "Singapore",
      dateOfBirth: "1983-04-17",
      passportNumber: "SG3849201",
      passportExpiry: "2027-02-14",
      nationality: "Singapore",
      travelPreferences: "Luxury resorts, spa packages",
      loyaltyPrograms: "Singapore Airlines KrisFlyer #SQ83821",
      dietaryNotes: null,
      mobilityNotes: null,
      status: "active",
      travelers: [
        { firstName: "Wei", lastName: "Lin", relationshipToClient: "Spouse", dateOfBirth: "1982-09-29", nationality: "Singapore" },
        { firstName: "Xin", lastName: "Lin", relationshipToClient: "Child", dateOfBirth: "2016-03-11", nationality: "Singapore" },
      ],
    },
    {
      firstName: "Noah",
      lastName: "Bergström",
      email: "noah.bergstrom@example.com",
      phone: "+46-8-555-0176",
      address: "Kungsgatan 12",
      city: "Stockholm",
      country: "Sweden",
      dateOfBirth: "1980-02-27",
      passportNumber: "SE8471029",
      passportExpiry: "2024-11-30",
      nationality: "Sweden",
      travelPreferences: "Sustainable travel options preferred",
      loyaltyPrograms: null,
      dietaryNotes: null,
      mobilityNotes: "Uses a wheelchair, requires accessible transport",
      status: "active",
      travelers: [{ firstName: "Astrid", lastName: "Bergström", relationshipToClient: "Spouse", dateOfBirth: "1982-01-09", nationality: "Sweden" }],
    },
    {
      firstName: "Priscilla",
      lastName: "Duarte",
      email: "priscilla.duarte@example.com",
      phone: "+55-11-5555-0164",
      address: "Av. Paulista 900",
      city: "São Paulo",
      country: "Brazil",
      dateOfBirth: "1995-08-19",
      passportNumber: "BR7362819",
      passportExpiry: "2026-07-22",
      nationality: "Brazil",
      travelPreferences: "Beach destinations, likes group tours",
      loyaltyPrograms: "LATAM Pass #LA44921",
      dietaryNotes: null,
      mobilityNotes: null,
      status: "inactive",
      travelers: [{ firstName: "Bruno", lastName: "Duarte", relationshipToClient: "Sibling", dateOfBirth: "1997-12-02", nationality: "Brazil" }],
    },
    {
      firstName: "Hassan",
      lastName: "Al-Farsi",
      email: "hassan.alfarsi@example.com",
      phone: "+971-4-555-0129",
      address: "Sheikh Zayed Rd",
      city: "Dubai",
      country: "United Arab Emirates",
      dateOfBirth: "1972-05-06",
      passportNumber: "AE9384712",
      passportExpiry: "2029-04-18",
      nationality: "United Arab Emirates",
      travelPreferences: "First class only, prefers Emirates",
      loyaltyPrograms: "Emirates Skywards #EK10029",
      dietaryNotes: "Halal",
      mobilityNotes: null,
      status: "active",
      travelers: [
        { firstName: "Fatima", lastName: "Al-Farsi", relationshipToClient: "Spouse", dateOfBirth: "1975-03-21", nationality: "United Arab Emirates" },
        { firstName: "Yusuf", lastName: "Al-Farsi", relationshipToClient: "Child", dateOfBirth: "2008-12-01", nationality: "United Arab Emirates" },
        { firstName: "Layla", lastName: "Al-Farsi", relationshipToClient: "Child", dateOfBirth: "2013-06-17", nationality: "United Arab Emirates" },
      ],
    },
    {
      firstName: "Chloe",
      lastName: "Dubois",
      email: "chloe.dubois@example.com",
      phone: "+33-1-5555-0187",
      address: "18 Rue de Rivoli",
      city: "Paris",
      country: "France",
      dateOfBirth: "1998-10-23",
      passportNumber: "FR2093841",
      passportExpiry: "2025-08-09",
      nationality: "France",
      travelPreferences: "City breaks, art museums",
      loyaltyPrograms: null,
      dietaryNotes: null,
      mobilityNotes: null,
      status: "active",
      travelers: [{ firstName: "Antoine", lastName: "Dubois", relationshipToClient: "Companion", dateOfBirth: "1996-04-04", nationality: "France" }],
    },
    {
      firstName: "Ethan",
      lastName: "Walsh",
      email: "ethan.walsh@example.com",
      phone: "+1-312-555-0173",
      address: "900 N Michigan Ave",
      city: "Chicago",
      country: "United States",
      dateOfBirth: "1987-01-12",
      passportNumber: "US1029384",
      passportExpiry: "2026-05-27",
      nationality: "United States",
      travelPreferences: "Golf resorts, prefers non-stop flights",
      loyaltyPrograms: "American AAdvantage #AA88213",
      dietaryNotes: null,
      mobilityNotes: null,
      status: "active",
      travelers: [
        { firstName: "Olivia", lastName: "Walsh", relationshipToClient: "Spouse", dateOfBirth: "1989-06-30", nationality: "United States" },
        { firstName: "Henry", lastName: "Walsh", relationshipToClient: "Child", dateOfBirth: "2017-02-25", nationality: "United States" },
      ],
    },
    {
      firstName: "Amara",
      lastName: "Nwosu",
      email: "amara.nwosu@example.com",
      phone: "+27-11-555-0155",
      address: "5 Nelson Mandela Sq",
      city: "Johannesburg",
      country: "South Africa",
      dateOfBirth: "1993-11-27",
      passportNumber: "ZA5647382",
      passportExpiry: "2027-09-30",
      nationality: "South Africa",
      travelPreferences: "Safari lodges, photography tours",
      loyaltyPrograms: null,
      dietaryNotes: null,
      mobilityNotes: null,
      status: "active",
      travelers: [
        { firstName: "Kwame", lastName: "Nwosu", relationshipToClient: "Sibling", dateOfBirth: "1996-02-14", nationality: "South Africa" },
        { firstName: "Zanele", lastName: "Mokoena", relationshipToClient: "Friend", dateOfBirth: "1994-10-30", nationality: "South Africa" },
      ],
    },
    {
      firstName: "Isabella",
      lastName: "Romano",
      email: "isabella.romano@example.com",
      phone: "+39-06-5555-0142",
      address: "Via del Corso 88",
      city: "Rome",
      country: "Italy",
      dateOfBirth: "1981-03-03",
      passportNumber: "IT8302941",
      passportExpiry: "2025-01-16",
      nationality: "Italy",
      travelPreferences: "Culinary tours, wine regions",
      loyaltyPrograms: "Alitalia Millemiglia #AZ77210",
      dietaryNotes: null,
      mobilityNotes: null,
      status: "active",
      travelers: [
        { firstName: "Marco", lastName: "Romano", relationshipToClient: "Spouse", dateOfBirth: "1979-07-19", nationality: "Italy" },
        { firstName: "Giulia", lastName: "Romano", relationshipToClient: "Child", dateOfBirth: "2011-09-06", nationality: "Italy" },
        { firstName: "Nonna Rosa", lastName: "Romano", relationshipToClient: "Grandparent", dateOfBirth: "1948-12-11", nationality: "Italy" },
      ],
    },
    {
      firstName: "Daniel",
      lastName: "Kim",
      email: "daniel.kim@example.com",
      phone: "+82-2-555-0138",
      address: "45 Gangnam-daero",
      city: "Seoul",
      country: "South Korea",
      dateOfBirth: "1990-09-14",
      passportNumber: "KR9384712",
      passportExpiry: "2028-06-08",
      nationality: "South Korea",
      travelPreferences: "Ski trips, prefers boutique hotels",
      loyaltyPrograms: "Korean Air SKYPASS #KE55210",
      dietaryNotes: null,
      mobilityNotes: null,
      status: "active",
      travelers: [{ firstName: "Hana", lastName: "Kim", relationshipToClient: "Spouse", dateOfBirth: "1992-04-08", nationality: "South Korea" }],
    },
  ];

  const clients = [];
  for (let i = 0; i < clientSeeds.length; i++) {
    const seed = clientSeeds[i];
    const { travelers, dateOfBirth, passportExpiry, ...rest } = seed;
    const client = await prisma.client.create({
      data: {
        ...rest,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        passportExpiry: passportExpiry ? new Date(passportExpiry) : null,
        assignedAgentId: agents[i % agents.length].id,
      },
    });
    clients.push(client);

    for (const t of travelers) {
      await prisma.traveler.create({
        data: {
          clientId: client.id,
          firstName: t.firstName,
          lastName: t.lastName,
          relationshipToClient: t.relationshipToClient,
          dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth) : null,
          nationality: t.nationality,
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        entityType: "Client",
        entityId: client.id,
        action: "created",
        description: `Client ${client.firstName} ${client.lastName} created`,
        userId: agents[i % agents.length].id,
        clientId: client.id,
      },
    });
  }

  console.log("Creating trips...");
  const tripSeeds = [
    { client: clients[0], name: "Tuscany Anniversary Escape", destination: "Florence, Italy", status: "COMPLETED", startDate: daysFromNow(-120), endDate: daysFromNow(-108), totalPrice: 8400 },
    { client: clients[1], name: "London to Edinburgh Rail Tour", destination: "United Kingdom", status: "COMPLETED", startDate: daysFromNow(-90), endDate: daysFromNow(-80), totalPrice: 6200 },
    { client: clients[3], name: "Cancún Family All-Inclusive", destination: "Cancún, Mexico", status: "TRAVELING", startDate: daysFromNow(-3), endDate: daysFromNow(4), totalPrice: 11200 },
    { client: clients[4], name: "Cape Town Business & Leisure", destination: "Cape Town, South Africa", status: "BOOKED", startDate: daysFromNow(18), endDate: daysFromNow(25), totalPrice: 9800 },
    { client: clients[6], name: "Bali Spa Retreat", destination: "Bali, Indonesia", status: "BOOKED", startDate: daysFromNow(32), endDate: daysFromNow(40), totalPrice: 7600 },
    { client: clients[9], name: "Paris Spring City Break", destination: "Paris, France", status: "QUOTED", startDate: daysFromNow(60), endDate: daysFromNow(65), totalPrice: 3400 },
    { client: clients[10], name: "Scottsdale Golf Getaway", destination: "Scottsdale, USA", status: "QUOTED", startDate: daysFromNow(75), endDate: daysFromNow(80), totalPrice: 5100 },
    { client: clients[11], name: "Kenya Photography Safari", destination: "Maasai Mara, Kenya", status: "INQUIRY", startDate: daysFromNow(100), endDate: daysFromNow(110), totalPrice: null },
    { client: clients[12], name: "Amalfi Coast Culinary Tour", destination: "Amalfi Coast, Italy", status: "INQUIRY", startDate: daysFromNow(140), endDate: daysFromNow(148), totalPrice: null },
    { client: clients[13], name: "Hokkaido Ski Trip", destination: "Hokkaido, Japan", status: "CANCELLED", startDate: daysFromNow(-20), endDate: daysFromNow(-12), totalPrice: 5900 },
  ];

  const trips = [];
  for (const t of tripSeeds) {
    const trip = await prisma.trip.create({
      data: {
        clientId: t.client.id,
        name: t.name,
        destination: t.destination,
        status: t.status,
        startDate: t.startDate,
        endDate: t.endDate,
        totalPrice: t.totalPrice,
      },
    });
    trips.push(trip);
  }

  console.log("Creating invoices...");
  const invoiceSeeds = [
    { trip: trips[0], client: clients[0], amount: 8400, amountPaid: 8400, status: "PAID", dueDate: daysFromNow(-115) },
    { trip: trips[1], client: clients[1], amount: 6200, amountPaid: 6200, status: "PAID", dueDate: daysFromNow(-85) },
    { trip: trips[2], client: clients[3], amount: 11200, amountPaid: 5600, status: "PARTIALLY_PAID", dueDate: daysFromNow(10) },
    { trip: trips[3], client: clients[4], amount: 9800, amountPaid: 2000, status: "PARTIALLY_PAID", dueDate: daysFromNow(5) },
    { trip: trips[4], client: clients[6], amount: 7600, amountPaid: 0, status: "SENT", dueDate: daysFromNow(20) },
    { trip: trips[9], client: clients[13], amount: 5900, amountPaid: 0, status: "OVERDUE", dueDate: daysFromNow(-15) },
  ];

  let invoiceCounter = 1001;
  for (const inv of invoiceSeeds) {
    await prisma.invoice.create({
      data: {
        clientId: inv.client.id,
        tripId: inv.trip.id,
        invoiceNumber: `INV-${invoiceCounter++}`,
        amount: inv.amount,
        amountPaid: inv.amountPaid,
        status: inv.status,
        dueDate: inv.dueDate,
      },
    });
  }

  console.log("Creating inquiries...");
  await prisma.inquiry.createMany({
    data: [
      { name: "Rachel Simmons", email: "rachel.simmons@example.com", phone: "+1-617-555-0199", source: "web_form", status: "NEW", notes: "Interested in a Greek islands honeymoon package." },
      { name: "Tom Bradley", email: "tom.bradley@example.com", source: "referral", status: "NEW", notes: "Referred by Elena Marquez, asking about safari trips." },
      { name: "Yuki Sato", email: "yuki.sato@example.com", source: "walk_in", status: "CONTACTED", notes: "Wants a quote for a Kyoto autumn tour." },
      { name: "Ben Carter", phone: "+1-212-555-0111", source: "phone", status: "NEW", notes: "Left a voicemail about group travel for a corporate retreat." },
    ],
  });

  console.log("Creating notes & reminders...");
  await prisma.note.create({
    data: {
      clientId: clients[0].id,
      authorId: agents[0].id,
      body: "Elena mentioned she and David are celebrating their 10th anniversary next year — worth proposing a milestone trip.",
    },
  });
  await prisma.note.create({
    data: {
      clientId: clients[3].id,
      authorId: agents[1].id,
      body: "Family prefers late checkout and connecting rooms. Confirmed with resort for the Cancún trip.",
    },
  });

  await prisma.reminder.create({
    data: {
      clientId: clients[7].id,
      type: "PASSPORT_EXPIRY",
      title: "Noah Bergström's passport expires soon — advise renewal",
      dueDate: daysFromNow(30),
    },
  });
  await prisma.reminder.create({
    data: {
      clientId: clients[3].id,
      type: "FINAL_PAYMENT",
      title: "Collect remaining balance for Cancún Family All-Inclusive",
      dueDate: daysFromNow(10),
    },
  });
  await prisma.reminder.create({
    data: {
      clientId: clients[13].id,
      type: "FINAL_PAYMENT",
      title: "Follow up on overdue Hokkaido Ski Trip invoice",
      dueDate: daysFromNow(-15),
    },
  });

  console.log("Seed complete.");
  console.log(`Users: ${await prisma.user.count()}`);
  console.log(`Clients: ${await prisma.client.count()}`);
  console.log(`Travelers: ${await prisma.traveler.count()}`);
  console.log(`Trips: ${await prisma.trip.count()}`);
  console.log(`Invoices: ${await prisma.invoice.count()}`);
  console.log(`Inquiries: ${await prisma.inquiry.count()}`);
  console.log("");
  console.log("Login with:");
  console.log("  admin@aeriahub.com / Password123!");
  console.log("  marcus@aeriahub.com / Password123!");
  console.log("  priya@aeriahub.com / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
