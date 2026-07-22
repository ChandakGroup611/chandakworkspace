require('dotenv').config({ path: '.env.local' });
// polyfill for Next.js cookies and headers to prevent errors when importing Next.js files in Node
jest = require('jest-mock');
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ get: () => undefined }),
  headers: jest.fn().mockResolvedValue({ get: () => undefined }),
}));

// We can't easily require TypeScript files that import Next.js modules without ts-node or next internals.
// Let's just create a next route to test it.
