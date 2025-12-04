# Scheduler & Workflow Activation Fix

## Issue
The user reported that scheduled workflows (e.g., "at 6") were not starting automatically. Additionally, the user wanted to enforce a "2-day expiration" policy where users must visit the site to reactivate workflows, ensuring only 1 active workflow per user.

## Root Cause
1.  **Missing Activation**: When a workflow was "Published" in the UI, it was saved with `status: 'published'` but `isActive: false`.
2.  **Scheduler Requirement**: The `SchedulerService` strictly ignored workflows where `isActive` was false (to respect the expiration policy).
3.  **Missing Sync**: Even if manually activated, the `SchedulerService` wasn't notified immediately, requiring a server restart or refresh to pick up the new schedule.

## Fix Implemented
1.  **Frontend (`Workflow.tsx`)**:
    *   Updated `saveWorkflow` to automatically call `api.activateWorkflow(id)` immediately after publishing a workflow.
    *   This sets `isActive: true` and initializes the 2-day expiration timer.

2.  **Backend Controller (`workflow.controller.ts`)**:
    *   Updated `activate` method to call `schedulerService.scheduleWorkflow(workflow)`. This ensures the cron job is registered immediately upon activation.
    *   Updated `deactivate` method to call `schedulerService.unscheduleWorkflow(id)`.

3.  **Backend Services**:
    *   **Reverted** previous changes to `SchedulerService` and `ExecutorService` that bypassed the `isActive` check.
    *   Now, `isActive` **is required** for scheduling and execution, preserving the user's intended 2-day expiration logic.

## Result
*   Publishing a workflow now makes it "Active" immediately.
*   The Scheduler picks it up instantly.
*   The workflow will run on schedule (e.g., 6 PM).
*   After 2 days, it will auto-expire (become inactive) and stop running, requiring the user to visit and reactivate it, fulfilling the business requirement.

