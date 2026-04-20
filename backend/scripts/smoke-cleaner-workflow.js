/* eslint-disable no-console */
const baseUrl = process.env.SMOKE_API_BASE || "http://localhost:5000/api";

const jsonRequest = async (url, options = {}) => {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        ...options,
    });

    const text = await response.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { raw: text };
    }

    return {
        ok: response.ok,
        status: response.status,
        data,
    };
};

const expectOk = (result, stepLabel) => {
    if (!result.ok) {
        throw new Error(`${stepLabel} failed (${result.status}): ${JSON.stringify(result.data)}`);
    }
};

const expectStatus = (result, expectedStatus, stepLabel) => {
    if (result.status !== expectedStatus) {
        throw new Error(
            `${stepLabel} expected ${expectedStatus} but got ${result.status}: ${JSON.stringify(result.data)}`
        );
    }
};

const findCleanerByEmail = (rows, email) =>
    (rows || []).find((row) => String(row.email || "").toLowerCase() === email.toLowerCase());

async function run() {
    const stamp = Date.now();
    const adminActor = "admin-smoke-test@hygia.local";

    const approveEmail = `approve.${stamp}@example.com`;
    const rejectEmail = `reject.${stamp}@example.com`;

    console.log(`Using API base: ${baseUrl}`);

    const health = await jsonRequest(`${baseUrl}/health`);
    expectOk(health, "Health check");
    console.log("1) Health check passed");

    const signupApprove = await jsonRequest(`${baseUrl}/cleaners/signup-request`, {
        method: "POST",
        body: JSON.stringify({
            name: "Smoke Approve User",
            email: approveEmail,
            password: "test123",
            mobileNumber: "+919999990001",
        }),
    });
    expectOk(signupApprove, "Approve-candidate signup");
    console.log("2) Approve-candidate signup passed");

    const pendingAfterApproveSignup = await jsonRequest(`${baseUrl}/cleaners/pending`);
    expectOk(pendingAfterApproveSignup, "Pending list after approve signup");
    const approveCandidate = findCleanerByEmail(pendingAfterApproveSignup.data, approveEmail);
    if (!approveCandidate?._id) {
        throw new Error("Approve candidate was not found in pending requests list.");
    }
    console.log("3) Approve-candidate found in pending list");

    const approveResult = await jsonRequest(`${baseUrl}/cleaners/${approveCandidate._id}/approve`, {
        method: "PUT",
        body: JSON.stringify({
            approvedBy: adminActor,
            note: "Smoke-test approval",
        }),
    });
    expectOk(approveResult, "Approve request");
    console.log("4) Approve action passed");

    const rosterInactive = await jsonRequest(`${baseUrl}/cleaners/${approveCandidate._id}/roster`, {
        method: "PUT",
        body: JSON.stringify({
            actor: adminActor,
            accountStatus: "inactive",
            note: "Temporarily deactivated in smoke test",
        }),
    });
    expectOk(rosterInactive, "Roster set inactive");

    const rosterShiftActive = await jsonRequest(`${baseUrl}/cleaners/${approveCandidate._id}/roster`, {
        method: "PUT",
        body: JSON.stringify({
            actor: adminActor,
            shift: "afternoon",
            accountStatus: "active",
            note: "Shift updated and reactivated in smoke test",
        }),
    });
    expectOk(rosterShiftActive, "Roster set shift+active");
    console.log("5) Roster update actions passed");

    const approveLogin = await jsonRequest(`${baseUrl}/cleaners/login`, {
        method: "POST",
        body: JSON.stringify({
            email: approveEmail,
            password: "test123",
        }),
    });
    expectOk(approveLogin, "Approved cleaner login");
    console.log("6) Approved cleaner login passed");

    const signupReject = await jsonRequest(`${baseUrl}/cleaners/signup-request`, {
        method: "POST",
        body: JSON.stringify({
            name: "Smoke Reject User",
            email: rejectEmail,
            password: "test123",
            mobileNumber: "+919999990002",
        }),
    });
    expectOk(signupReject, "Reject-candidate signup");
    console.log("7) Reject-candidate signup passed");

    const pendingAfterRejectSignup = await jsonRequest(`${baseUrl}/cleaners/pending`);
    expectOk(pendingAfterRejectSignup, "Pending list after reject signup");
    const rejectCandidate = findCleanerByEmail(pendingAfterRejectSignup.data, rejectEmail);
    if (!rejectCandidate?._id) {
        throw new Error("Reject candidate was not found in pending requests list.");
    }

    const rejectResult = await jsonRequest(`${baseUrl}/cleaners/${rejectCandidate._id}/reject`, {
        method: "PUT",
        body: JSON.stringify({
            rejectedBy: adminActor,
            reason: "Smoke-test rejection",
        }),
    });
    expectOk(rejectResult, "Reject request");
    console.log("8) Reject action passed");

    const rejectedLogin = await jsonRequest(`${baseUrl}/cleaners/login`, {
        method: "POST",
        body: JSON.stringify({
            email: rejectEmail,
            password: "test123",
        }),
    });
    expectStatus(rejectedLogin, 403, "Rejected cleaner login should be blocked");
    console.log("9) Rejected cleaner login blocked as expected");

    console.log("SMOKE TEST PASSED: cleaner signup/approve/reject/roster/login flow is working.");
}

run().catch((error) => {
    console.error("SMOKE TEST FAILED:", error.message);
    process.exit(1);
});
