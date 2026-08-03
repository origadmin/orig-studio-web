/**
 * Notification Scroll Load Test
 *
 * Usage: Paste this script into browser DevTools Console (F12)
 * on the /notifications page, then wait for the report.
 *
 * Tests:
 * 1. Duplicate request detection (same page requested twice)
 * 2. Data duplication (same notification ID appears twice)
 * 3. Rapid scroll stress test (scroll to bottom 5 times quickly)
 * 4. Optimistic update verification (no full-screen spinner after operations)
 */

(async function notificationScrollTest() {
    'use strict';

    console.log('%c=== Notification Scroll Load Test ===', 'color: #3b82f6; font-weight: bold; font-size: 16px');

    // ─── Setup: intercept API requests ───
    const apiRequests = [];
    const seenIds = new Set();

    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = (args[0] || '').toString();
        if (url.includes('/api/v1/notifications')) {
            apiRequests.push({
                url,
                method: args[1]?.method || 'GET',
                timestamp: Date.now(),
            });
        }
        return originalFetch.apply(this, args);
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._testUrl = url;
        this._testMethod = method;
        return originalXHROpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
        if (this._testUrl && this._testUrl.toString().includes('/api/v1/notifications')) {
            apiRequests.push({
                url: this._testUrl.toString(),
                method: this._testMethod || 'GET',
                timestamp: Date.now(),
            });
        }
        return originalXHRSend.apply(this, arguments);
    };

    // ─── Helper: extract page number from URL ───
    function extractPage(url) {
        const match = url.match(/[?&]page=(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    // ─── Helper: get current notification count ───
    function getNotificationCount() {
        return document.querySelectorAll('h4.font-medium, h4.font-semibold').length;
    }

    // ─── Helper: get notification IDs from DOM ───
    function getNotificationTitles() {
        const titles = [];
        document.querySelectorAll('h4.font-medium, h4.font-semibold').forEach(el => {
            titles.push(el.textContent.trim());
        });
        return titles;
    }

    // ─── Test 1: Initial load ───
    console.log('%c[Test 1] Initial page load...', 'color: #8b5cf6; font-weight: bold');
    const initialCount = getNotificationCount();
    const initialRequests = apiRequests.length;
    console.log(`  Notifications on page: ${initialCount}`);
    console.log(`  API requests so far: ${initialRequests}`);

    await new Promise(r => setTimeout(r, 1000));

    // ─── Test 2: Rapid scroll stress test ───
    console.log('%c[Test 2] Rapid scroll stress test (5 scrolls)...', 'color: #8b5cf6; font-weight: bold');
    const beforeScrollRequests = [...apiRequests];
    const beforeScrollCount = getNotificationCount();

    for (let i = 0; i < 5; i++) {
        // Scroll to bottom
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 200));
        // Scroll up slightly
        window.scrollTo(0, document.body.scrollHeight - 100);
        await new Promise(r => setTimeout(r, 200));
        // Scroll back to bottom
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 800));
    }

    // Wait for all pending requests
    await new Promise(r => setTimeout(r, 2000));

    const afterScrollCount = getNotificationCount();
    const scrollApiRequests = apiRequests.slice(beforeScrollRequests.length);
    const pagesRequested = scrollApiRequests
        .map(r => extractPage(r.url))
        .filter(p => p !== null);

    console.log(`  Notifications before: ${beforeScrollCount}`);
    console.log(`  Notifications after: ${afterScrollCount}`);
    console.log(`  API requests during scroll: ${scrollApiRequests.length}`);
    console.log(`  Pages requested: [${pagesRequested.join(', ')}]`);

    // ─── Test 3: Duplicate request detection ───
    console.log('%c[Test 3] Duplicate request detection...', 'color: #8b5cf6; font-weight: bold');
    const pageCounts = {};
    pagesRequested.forEach(p => {
        pageCounts[p] = (pageCounts[p] || 0) + 1;
    });
    const duplicatePages = Object.entries(pageCounts).filter(([_, count]) => count > 1);

    if (duplicatePages.length === 0) {
        console.log('%c  ✅ PASS: No duplicate page requests', 'color: #22c55e; font-weight: bold');
    } else {
        console.log('%c  ❌ FAIL: Duplicate page requests detected:', 'color: #ef4444; font-weight: bold');
        duplicatePages.forEach(([page, count]) => {
            console.log(`     Page ${page} requested ${count} times`);
        });
    }

    // ─── Test 4: Data duplication check ───
    console.log('%c[Test 4] Data duplication check...', 'color: #8b5cf6; font-weight: bold');
    const titles = getNotificationTitles();
    const uniqueTitles = new Set(titles);
    const hasDataDuplicates = titles.length !== uniqueTitles.size;

    if (!hasDataDuplicates) {
        console.log('%c  ✅ PASS: No duplicate notifications', 'color: #22c55e; font-weight: bold');
        console.log(`     Total: ${titles.length} notifications, ${uniqueTitles.size} unique`);
    } else {
        const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
        console.log('%c  ❌ FAIL: Duplicate notifications found:', 'color: #ef4444; font-weight: bold');
        console.log(`     Total: ${titles.length}, Unique: ${uniqueTitles.size}, Duplicates: ${dupes.length}`);
        dupes.forEach(d => console.log(`     - "${d}"`));
    }

    // ─── Test 5: Full-screen spinner check ───
    console.log('%c[Test 5] Checking for full-screen spinner (loading state)...', 'color: #8b5cf6; font-weight: bold');
    const spinner = document.querySelector('[class*="animate-spin"]');
    const isLoading = spinner && spinner.closest('[class*="min-h-[200px]"]');
    if (!isLoading) {
        console.log('%c  ✅ PASS: No full-screen loading spinner', 'color: #22c55e; font-weight: bold');
    } else {
        console.log('%c  ⚠️ WARN: Full-screen spinner is visible (may be initial load)', 'color: #f59e0b; font-weight: bold');
    }

    // ─── Summary ───
    console.log('%c=== Test Summary ===', 'color: #3b82f6; font-weight: bold; font-size: 14px');
    console.log(`  Total API requests: ${apiRequests.length}`);
    console.log(`  Pages requested: [${pagesRequested.join(', ')}]`);
    console.log(`  Notifications loaded: ${afterScrollCount}`);
    console.log(`  Duplicate requests: ${duplicatePages.length === 0 ? 'None ✅' : `${duplicatePages.length} ❌`}`);
    console.log(`  Data duplicates: ${!hasDataDuplicates ? 'None ✅' : `${titles.length - uniqueTitles.size} ❌`}`);

    // Full request log
    console.log('%c--- Full API Request Log ---', 'color: #6b7280');
    apiRequests.forEach((req, i) => {
        const page = extractPage(req.url) || '-';
        console.log(`  [${i + 1}] ${req.method} page=${page} ${req.url.split('/api/v1')[1] || req.url} @ ${new Date(req.timestamp).toISOString().split('T')[1]}`);
    });

    // Restore original functions
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;

    console.log('%c=== Test Complete ===', 'color: #3b82f6; font-weight: bold; font-size: 16px');

    // Return result object for programmatic access
    return {
        totalRequests: apiRequests.length,
        pagesRequested,
        duplicateRequests: duplicatePages,
        notificationsLoaded: afterScrollCount,
        hasDataDuplicates,
        allRequests: apiRequests,
    };
})();
