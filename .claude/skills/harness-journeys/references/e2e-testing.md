# E2E 여정 테스트 (원본 스킬 코드 보존)

원본: alinaqi/maggy user-journeys (MIT). 코드베이스에서 여정 명세를 Playwright 테스트로 옮길 때만 읽는다.

## 목차
1. Journey Testing with Playwright (여정 테스트 구조, 에러 복구 테스트)
2. Automated UX Checks (자동 UX 검사 유틸)
3. Journey Metrics Dashboard (단계별 지표 추적)
4. Package.json Scripts

## Journey Testing with Playwright

### Journey Test Structure

```typescript
// e2e/tests/journeys/signup-to-value.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Journey: Signup to First Value', () => {
  test.describe.configure({ mode: 'serial' }); // Run in order

  test('Step 1: Landing page has clear CTA', async ({ page }) => {
    await page.goto('/');

    // CTA visible above fold without scrolling
    const cta = page.getByRole('button', { name: /get started|try free/i });
    await expect(cta).toBeVisible();
    await expect(cta).toBeInViewport();
  });

  test('Step 2: Can create account quickly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();

    // Minimal fields
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Complete signup
    const startTime = Date.now();
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByRole('button', { name: /sign up|create/i }).click();

    // Should reach onboarding quickly
    await expect(page).toHaveURL(/onboarding|welcome|setup/);
    expect(Date.now() - startTime).toBeLessThan(5000); // < 5 seconds
  });

  test('Step 3: Onboarding is skippable', async ({ page }) => {
    // ... login as new user ...
    await page.goto('/onboarding');

    // Skip option exists
    const skipButton = page.getByRole('button', { name: /skip/i });
    await expect(skipButton).toBeVisible();
  });

  test('Step 4: Can reach first value in < 5 min', async ({ page }) => {
    // Full journey timing
    const journeyStart = Date.now();

    // ... complete full journey ...

    // Verify first value delivered
    await expect(page.getByText(/success|created|done/i)).toBeVisible();

    // Total time check
    const totalTime = (Date.now() - journeyStart) / 1000 / 60; // minutes
    expect(totalTime).toBeLessThan(5);
  });
});
```

### Error Recovery Tests

```typescript
// e2e/tests/journeys/checkout-recovery.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Journey: Checkout Error Recovery', () => {
  test('recovers from payment decline gracefully', async ({ page }) => {
    // Setup: Add item to cart, go to checkout
    await page.goto('/products');
    await page.getByTestId('add-to-cart').first().click();
    await page.getByRole('link', { name: 'Checkout' }).click();

    // Use Stripe test card that declines
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]');
    await stripeFrame.getByPlaceholder('Card number').fill('4000000000000002');
    await stripeFrame.getByPlaceholder('MM / YY').fill('12/30');
    await stripeFrame.getByPlaceholder('CVC').fill('123');

    await page.getByRole('button', { name: /pay/i }).click();

    // Verify friendly error
    await expect(page.getByText(/declined|try another/i)).toBeVisible();

    // Verify still on checkout (not kicked out)
    await expect(page).toHaveURL(/checkout/);

    // Verify can try again with different card
    await stripeFrame.getByPlaceholder('Card number').fill('4242424242424242');
    await page.getByRole('button', { name: /pay/i }).click();

    // Should succeed now
    await expect(page).toHaveURL(/success|confirmation/);
  });

  test('preserves cart after session timeout', async ({ page, context }) => {
    // Add items to cart
    await page.goto('/products');
    await page.getByTestId('add-to-cart').first().click();

    // Clear session (simulate timeout)
    await context.clearCookies();

    // Return to site
    await page.goto('/cart');

    // Cart should be preserved (local storage or recovered)
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
  });
});
```

---

### Automated UX Checks

```typescript
// e2e/utils/ux-validators.ts
import { Page, expect } from '@playwright/test';

export async function validatePageLoad(page: Page, maxMs = 2000) {
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return nav.loadEventEnd - nav.startTime;
  });
  expect(timing).toBeLessThan(maxMs);
}

export async function validateCTAVisible(page: Page, ctaText: RegExp) {
  const cta = page.getByRole('button', { name: ctaText });
  await expect(cta).toBeVisible();
  await expect(cta).toBeInViewport();
}

export async function validateNoLayoutShift(page: Page) {
  const cls = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 1000);
    });
  });
  expect(cls).toBeLessThan(0.1); // Good CLS score
}

export async function validateAccessibility(page: Page) {
  // Check focus visible on interactive elements
  const buttons = page.getByRole('button');
  const count = await buttons.count();

  for (let i = 0; i < Math.min(count, 5); i++) {
    await buttons.nth(i).focus();
    await expect(buttons.nth(i)).toBeFocused();
  }
}
```

---

## Journey Metrics Dashboard

Track journey health with these metrics:

```typescript
// lib/journey-metrics.ts
interface JourneyMetric {
  journey: string;
  step: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  userId?: string;
}

// Track in your analytics (PostHog, Mixpanel, etc.)
export function trackJourneyStep(metric: JourneyMetric) {
  analytics.track('journey_step', {
    journey_name: metric.journey,
    step_name: metric.step,
    duration_ms: metric.duration,
    success: metric.success,
  });
}

// Example usage in app
const journeyStart = Date.now();
// ... user completes step ...
trackJourneyStep({
  journey: 'signup_to_value',
  step: 'account_creation',
  timestamp: new Date(),
  duration: Date.now() - journeyStart,
  success: true,
});
```

---

### Package.json Scripts

```json
{
  "scripts": {
    "test:journeys": "playwright test e2e/tests/journeys/",
    "test:journeys:critical": "playwright test e2e/tests/journeys/critical/",
    "test:journeys:report": "playwright show-report"
  }
}
```

