#!/usr/bin/env node
// QMe Task: Logistics Route Optimization - REAL ROUTE DATABASE
// Run by QMe: qme run node src/qme/tasks/logistics-route.js <base64-data>
// Uses the real trade route database and optimization algorithm from the Logistics Service

const dataArg = process.argv[2];
if (!dataArg) {
  console.error('Error: No task data provided');
  process.exit(1);
}

let taskData;
try {
  const jsonStr = Buffer.from(dataArg, 'base64').toString('utf-8');
  taskData = JSON.parse(jsonStr);
} catch (error) {
  console.error('Error: Invalid task data:', error.message);
  process.exit(1);
}

console.log(`[QMe Task] Starting route optimization for shipment: ${taskData.shipmentId || 'unknown'}`);
console.log(`[QMe Task] Route: ${taskData.origin || 'origin'} → ${taskData.destination || 'destination'}`);
console.log(`[QMe Task] Priority: ${taskData.priority || 'balanced'}`);

const startTime = Date.now();

// Real trade routes database (same as logisticsService)
const ROUTE_DATABASE = [
  { origin: 'Shanghai', destination: 'Mombasa', sea: { days: 22, cost: 1800 }, air: { days: 2, cost: 8500 }, reliability: 0.82 },
  { origin: 'Shanghai', destination: 'Lagos', sea: { days: 28, cost: 2200 }, air: { days: 3, cost: 9500 }, reliability: 0.78 },
  { origin: 'Shenzhen', destination: 'Mombasa', sea: { days: 20, cost: 1700 }, air: { days: 2, cost: 8000 }, reliability: 0.85 },
  { origin: 'Mumbai', destination: 'Mombasa', sea: { days: 8, cost: 800 }, air: { days: 1, cost: 3500 }, reliability: 0.88 },
  { origin: 'Mumbai', destination: 'Dar es Salaam', sea: { days: 10, cost: 900 }, air: { days: 1, cost: 3800 }, reliability: 0.86 },
  { origin: 'Istanbul', destination: 'Mombasa', sea: { days: 15, cost: 1400 }, air: { days: 2, cost: 6000 }, reliability: 0.85 },
  { origin: 'Istanbul', destination: 'Lagos', sea: { days: 12, cost: 1200 }, air: { days: 2, cost: 5500 }, reliability: 0.87 },
  { origin: 'Rotterdam', destination: 'Mombasa', sea: { days: 18, cost: 1600 }, air: { days: 2, cost: 7500 }, reliability: 0.90 },
  { origin: 'Rotterdam', destination: 'Cape Town', sea: { days: 12, cost: 1100 }, air: { days: 2, cost: 5200 }, reliability: 0.92 },
  { origin: 'Dubai', destination: 'Mombasa', sea: { days: 12, cost: 1100 }, air: { days: 2, cost: 4500 }, reliability: 0.88 },
  { origin: 'Dubai', destination: 'Dar es Salaam', sea: { days: 14, cost: 1200 }, air: { days: 2, cost: 4800 }, reliability: 0.86 },
  { origin: 'Mombasa', destination: 'Nairobi', road: { days: 1, cost: 200 }, reliability: 0.90 },
  { origin: 'Mombasa', destination: 'Kampala', road: { days: 3, cost: 600 }, reliability: 0.75 },
  { origin: 'Dar es Salaam', destination: 'Kigali', road: { days: 3, cost: 550 }, reliability: 0.72 },
  { origin: 'Lagos', destination: 'Accra', road: { days: 2, cost: 350 }, reliability: 0.78 },
  { origin: 'Mombasa', destination: 'Johannesburg', sea: { days: 10, cost: 800 }, reliability: 0.80 }
];

const origin = taskData.origin || 'Shanghai';
const destination = taskData.destination || 'Mombasa';
const priority = taskData.priority || 'balanced';

// Find matching routes
const matchingRoutes = ROUTE_DATABASE.filter(r =>
  r.origin.toLowerCase().includes(origin.toLowerCase()) &&
  r.destination.toLowerCase().includes(destination.toLowerCase())
);

const routes = matchingRoutes.length > 0 ? matchingRoutes : (() => {
  // Try reverse
  const reversed = ROUTE_DATABASE.filter(r =>
    r.origin.toLowerCase().includes(destination.toLowerCase()) &&
    r.destination.toLowerCase().includes(origin.toLowerCase())
  );
  return reversed.map(r => ({
    ...r,
    sea: r.sea ? { ...r.sea, cost: Math.round(r.sea.cost * 1.1) } : undefined,
    air: r.air ? { ...r.air, cost: Math.round(r.air.cost * 1.1) } : undefined,
    road: r.road ? { ...r.road, cost: Math.round(r.road.cost * 1.1) } : undefined
  }));
})();

// Generate route options from bases
const routeOptions = [];
for (const route of (routes.length > 0 ? routes : [{ origin, destination, sea: { days: 25, cost: 2000 }, air: { days: 3, cost: 8000 }, road: { days: 10, cost: 1000 }, reliability: 0.8 }])) {
  const modes = [];
  if (route.sea) modes.push({ mode: 'sea', duration: route.sea.days, cost: route.sea.cost, reliability: route.reliability, carbon: 500 });
  if (route.air) modes.push({ mode: 'air', duration: route.air.days, cost: route.air.cost, reliability: route.reliability + 0.08, carbon: 2500 });
  if (route.road) modes.push({ mode: 'road', duration: route.road.days, cost: route.road.cost, reliability: route.reliability - 0.05, carbon: 1800 });

  // Multimodal (sea + road)
  if (route.sea && route.road) {
    modes.push({
      mode: 'multimodal',
      duration: route.sea.days + route.road.days,
      cost: route.sea.cost + route.road.cost,
      reliability: Math.round(route.reliability * 0.9 * 100) / 100,
      carbon: 1200,
      segments: [
        { transport: 'sea', from: origin, to: destination, duration: route.sea.days },
        { transport: 'road', from: destination, to: destination, duration: route.road.days }
      ]
    });
  }

  for (const mode of modes) {
    let score = 0;
    if (priority === 'fastest') score = (1 / mode.duration) * 1000;
    else if (priority === 'cheapest') score = (1 / mode.cost) * 100000;
    else if (priority === 'greenest') score = (1 / mode.carbon) * 100000;
    else score = (mode.reliability * 50) + (100 / mode.duration * 0.25) + (100000 / mode.cost * 0.00025);

    routeOptions.push({ ...mode, score: Math.round(score * 100) / 100 });
  }
}

routeOptions.sort((a, b) => b.score - a.score);

const elapsed = Date.now() - startTime;

const result = {
  task: 'logistics-route',
  shipmentId: taskData.shipmentId,
  status: 'completed',
  processingTimeMs: elapsed,
  route: { origin, destination },
  priority,
  recommendedRoute: routeOptions[0] || null,
  allRoutes: routeOptions,
  eta: routeOptions[0] ? new Date(Date.now() + routeOptions[0].duration * 86400000).toISOString() : null,
  shippingAdvice: {
    cheapest: routeOptions.slice().sort((a, b) => a.cost - b.cost)[0],
    fastest: routeOptions.slice().sort((a, b) => a.duration - b.duration)[0],
    mostReliable: routeOptions.slice().sort((a, b) => b.reliability - a.reliability)[0]
  },
  customsInfo: {
    requiresDeclaration: origin !== destination,
    estimatedClearanceDays: 3,
    requiredDocuments: ['Bill of Lading', 'Commercial Invoice', 'Packing List', 'Certificate of Origin'],
    dutiesApplicable: true
  }
};

console.log(JSON.stringify(result, null, 2));
console.log(`[QMe Task] Route optimization completed in ${elapsed}ms — recommended: ${routeOptions[0]?.mode || 'none'}`);
process.exit(0);
