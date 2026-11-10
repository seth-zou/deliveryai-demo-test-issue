# Boiling Point · Hotpot Ordering Demo

[中文](README.md)

A mobile ordering and fulfillment flow demo for hotpot stores, showcasing the complete experience from binding a table and group ordering to order fulfillment and checkout payment.

> This project is a concept demo and does not represent an official product.

## Features

- Bind a table and enter the ordering flow
- Browse by category, search for, and select dishes
- Configure dish options, taste, and diner
- Collaborative group ordering and cart management
- Track order preparation and serving progress
- Call for broth refill, drinks, tableware, and checkout service
- Simulate sold-out dishes, service responses, and fulfillment statuses
- Simulate the checkout and payment success flow
- Support Chinese/English switching and elderly mode

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- i18next
- Playwright

## Requirements

- Node.js 18 or later
- npm 9 or later

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The service runs at `http://localhost:5173` by default. If the port is already in use, Vite automatically selects another available port.

## Common Commands

```bash
# Start the development server
npm run dev

# Run code linting
npm run lint

# Build for production
npm run build
```

The production build output is generated in the `dist/` directory.

## Project Structure

```text
.
├── e2e/                    # Playwright end-to-end tests
├── server/                 # Demo server
├── src/
│   ├── assets/             # Image assets
│   ├── components/         # Page and shared components
│   ├── data/               # Demo data such as the menu
│   ├── hooks/              # React Hooks
│   ├── state/              # Order state management
│   ├── App.tsx             # Application entry component
│   ├── i18n.ts             # Chinese and English copy
│   └── index.css           # Global styles
├── index.html
├── tailwind.config.js
└── vite.config.ts
```

## Preview Mode

Visit the following URL to go directly to the menu preview with a table already bound and cart data loaded:

```text
http://localhost:5173/?preview=menu
```

The actual port is subject to the Vite startup log.
