/**
 * Comprehensive API testing script
 * Tests all endpoints with valid and invalid inputs
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000/api';

class APITester {
  constructor() {
    this.passCount = 0;
    this.failCount = 0;
    this.testData = {
      passengerId: null,
      driverId: null,
      rideId: null,
      bookingId: null
    };
  }

  async request(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, BASE_URL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : null;
            resolve({
              status: res.statusCode,
              data: parsed,
              headers: res.headers
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async test(name, method, endpoint, body, expectedStatus) {
    try {
      console.log(`\n🧪 ${name}`);
      const response = await this.request(method, endpoint, body);
      
      if (response.status === expectedStatus) {
        console.log(`   ✅ PASS (${response.status})`);
        this.passCount++;
        return response.data;
      } else {
        console.log(`   ❌ FAIL - Expected ${expectedStatus}, got ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}`);
        this.failCount++;
        return null;
      }
    } catch (err) {
      console.log(`   ❌ ERROR: ${err.message}`);
      this.failCount++;
      return null;
    }
  }

  printSummary() {
    console.log('\n\n📊 Test Summary:');
    console.log(`✅ Passed: ${this.passCount}`);
    console.log(`❌ Failed: ${this.failCount}`);
    console.log(`📈 Total: ${this.passCount + this.failCount}`);
    console.log(`Success Rate: ${((this.passCount / (this.passCount + this.failCount)) * 100).toFixed(1)}%`);
  }

  async runAllTests() {
    console.log('🚀 Starting API Tests...\n');

    // Health check
    await this.test('Health Check', 'GET', '/health', null, 200);

    // Auth endpoints - Passenger signup
    const signupResult = await this.test(
      'Passenger Signup - Valid',
      'POST',
      '/auth/signup',
      {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123',
        name: 'Test User',
        phone: '024 123 4567',
        role: 'passenger'
      },
      201
    );

    if (signupResult?.id) {
      this.testData.passengerId = signupResult.id;
    }

    // Auth endpoints - Invalid signup (missing fields)
    await this.test(
      'Passenger Signup - Missing Fields',
      'POST',
      '/auth/signup',
      { email: 'test@example.com' },
      400
    );

    // Auth endpoints - Invalid signup (short password)
    await this.test(
      'Passenger Signup - Short Password',
      'POST',
      '/auth/signup',
      {
        email: 'test@example.com',
        password: 'short',
        name: 'Test',
        phone: '024 123 4567',
        role: 'passenger'
      },
      400
    );

    // Auth endpoints - Signin (using a real user from seed)
    const signinResult = await this.test(
      'Passenger Signin - Valid',
      'POST',
      '/auth/signin',
      {
        email: 'passenger1@test.com',
        password: 'password123'
      },
      200
    );

    if (signinResult?.id) {
      this.testData.passengerId = signinResult.id;
    }

    // Auth endpoints - Signin with wrong password
    await this.test(
      'Passenger Signin - Wrong Password',
      'POST',
      '/auth/signin',
      {
        email: 'passenger1@test.com',
        password: 'wrongpassword'
      },
      401
    );

    // Auth endpoints - Get profile
    if (this.testData.passengerId) {
      await this.test(
        'Get User Profile - Valid',
        'GET',
        `/auth/${this.testData.passengerId}`,
        null,
        200
      );
    }

    // Auth endpoints - Get profile with invalid ID
    await this.test(
      'Get User Profile - Invalid ID',
      'GET',
      '/auth/invalid-id-123',
      null,
      404
    );

    // Driver signup
    const driverSignupResult = await this.test(
      'Driver Signup - Valid',
      'POST',
      '/auth/driver-signup',
      {
        email: `driver${Date.now()}@example.com`,
        password: 'DriverPassword123',
        name: 'Test Driver',
        phone: '024 234 5678',
        vehicleType: 'Trotro',
        licensePlate: 'TEST-001',
        vehicleModel: 'Toyota Hiace'
      },
      201
    );

    if (driverSignupResult?.driverId) {
      this.testData.driverId = driverSignupResult.driverId;
    }

    // Rides endpoints - Get available rides
    await this.test(
      'Get Available Rides',
      'GET',
      '/rides/available',
      null,
      200
    );

    // Rides endpoints - Create ride
    if (this.testData.driverId) {
      const createRideResult = await this.test(
        'Create Ride - Valid',
        'POST',
        '/rides/create',
        {
          driverId: this.testData.driverId,
          origin: 'Madina',
          destination: 'Circle',
          fare: 5.50,
          seats: 3,
          capacity: 4
        },
        201
      );

      if (createRideResult?.id) {
        this.testData.rideId = createRideResult.id;
      }
    }

    // Rides endpoints - Invalid ride creation (missing fields)
    await this.test(
      'Create Ride - Missing Fields',
      'POST',
      '/rides/create',
      { driverId: 'test-driver' },
      400
    );

    // Rides endpoints - Invalid ride creation (seats > capacity)
    if (this.testData.driverId) {
      await this.test(
        'Create Ride - Seats Exceed Capacity',
        'POST',
        '/rides/create',
        {
          driverId: this.testData.driverId,
          origin: 'Test',
          destination: 'Test',
          fare: 5,
          seats: 10,
          capacity: 5
        },
        400
      );
    }

    // Get ride details
    if (this.testData.rideId) {
      await this.test(
        'Get Ride Details - Valid',
        'GET',
        `/rides/${this.testData.rideId}`,
        null,
        200
      );
    }

    // Get ride details - Invalid ID
    await this.test(
      'Get Ride Details - Invalid ID',
      'GET',
      '/rides/invalid-ride-123',
      null,
      404
    );

    // Bookings endpoints - Create booking
    if (this.testData.rideId && this.testData.passengerId) {
      const bookingResult = await this.test(
        'Create Booking - Valid',
        'POST',
        '/bookings/create',
        {
          rideId: this.testData.rideId,
          passengerId: this.testData.passengerId
        },
        201
      );

      if (bookingResult?.id) {
        this.testData.bookingId = bookingResult.id;
      }
    }

    // Bookings endpoints - Invalid booking (missing fields)
    await this.test(
      'Create Booking - Missing Fields',
      'POST',
      '/bookings/create',
      { rideId: 'test' },
      400
    );

    // Get passenger bookings
    if (this.testData.passengerId) {
      await this.test(
        'Get Passenger Bookings - Valid',
        'GET',
        `/bookings/passenger/${this.testData.passengerId}`,
        null,
        200
      );
    }

    // Rate limiting test - Make multiple requests rapidly
    console.log('\n🧪 Testing Rate Limiting (Auth endpoint - 5 requests limit)');
    let rateLimitHit = false;
    for (let i = 0; i < 7; i++) {
      const response = await this.request('POST', '/auth/signin', {
        email: 'test@example.com',
        password: 'password'
      });
      if (response.status === 429) {
        console.log(`   Rate limit hit after ${i + 1} requests ✅`);
        rateLimitHit = true;
        this.passCount++;
        break;
      }
    }
    if (!rateLimitHit) {
      console.log('   Rate limiting not working as expected ⚠️');
    }

    this.printSummary();
  }
}

// Run tests
const tester = new APITester();
tester.runAllTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
