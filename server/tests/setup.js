/**
 * Jest setup.
 *
 * The suite is deliberately made of unit tests that need no database: they
 * cover the pure logic where the real bugs in this project have actually been
 * — slug collisions, entity encoding in imported headlines, YouTube URL
 * shapes, pagination arithmetic — and they run in under a second on any
 * machine, which is the difference between a suite that gets run and one that
 * does not.
 *
 * NODE_ENV=test also switches the rate limiters off and lets config/env.js
 * fall back to throwaway secrets, so nothing here touches server/.env.
 */
process.env.NODE_ENV = 'test';
process.env.TZ = 'Australia/Melbourne';

// Keep the output readable: the code under test logs deliberately on the
// failure paths the tests exercise.
jest.spyOn(console, 'error').mockImplementation(() => {});
