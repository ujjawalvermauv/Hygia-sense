jest.mock("../../server/models/CleaningTask", () => ({
    findOne: jest.fn(),
    create: jest.fn(),
}));

jest.mock("../../server/models/Toilet", () => ({
    findByIdAndUpdate: jest.fn(),
}));

jest.mock("../../server/models/Cleaner", () => ({
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
}));

jest.mock("../../server/services/aiInsightsService", () => ({
    getToiletInsights: jest.fn(),
    calculatePriorityFromRisk: jest.fn(() => "critical"),
}));

const CleaningTask = require("../../server/models/CleaningTask");
const Toilet = require("../../server/models/Toilet");
const Cleaner = require("../../server/models/Cleaner");
const aiInsightsService = require("../../server/services/aiInsightsService");
const { autoAssignHighRiskTasks } = require("../../server/controllers/aiController");

const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("aiController.autoAssignHighRiskTasks", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("prefers least-loaded cleaner when recommended cleaner is overloaded", async () => {
        const req = { body: { minimumRisk: 60, maxAssignments: 3 } };
        const res = createRes();

        aiInsightsService.getToiletInsights.mockResolvedValue([
            {
                toiletId: "toilet-1",
                riskScore: 92,
                recommendation: ["Clean now"],
                recommendedCleaner: { cleanerId: "cleaner-heavy", confidence: 90 },
            },
        ]);

        Cleaner.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                { _id: "cleaner-light", assignedTasks: 1, completedTasks: 4, approvalStatus: "approved", accountStatus: "active" },
                { _id: "cleaner-heavy", assignedTasks: 5, completedTasks: 5, approvalStatus: "approved", accountStatus: "active" },
            ]),
        });

        CleaningTask.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
        CleaningTask.create.mockResolvedValue({ _id: "task-1" });
        Cleaner.findByIdAndUpdate.mockResolvedValue({});
        Toilet.findByIdAndUpdate.mockResolvedValue({});

        await autoAssignHighRiskTasks(req, res);

        expect(CleaningTask.create).toHaveBeenCalledWith(
            expect.objectContaining({ cleaner: "cleaner-light", toilet: "toilet-1", status: "assigned" })
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test("skips toilet with duplicate open task and continues with next insight", async () => {
        const req = { body: { minimumRisk: 60, maxAssignments: 5 } };
        const res = createRes();

        aiInsightsService.getToiletInsights.mockResolvedValue([
            {
                toiletId: "toilet-dup",
                riskScore: 85,
                recommendation: ["Immediate cleaning"],
                recommendedCleaner: { cleanerId: "cleaner-1", confidence: 80 },
            },
            {
                toiletId: "toilet-ok",
                riskScore: 82,
                recommendation: ["Clean soon"],
                recommendedCleaner: { cleanerId: "cleaner-1", confidence: 80 },
            },
        ]);

        Cleaner.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                { _id: "cleaner-1", assignedTasks: 0, completedTasks: 0, approvalStatus: "approved", accountStatus: "active" },
            ]),
        });

        let callIndex = 0;
        CleaningTask.findOne.mockImplementation(() => {
            callIndex += 1;
            if (callIndex === 1) {
                return { lean: jest.fn().mockResolvedValue({ _id: "existing-open-task" }) };
            }
            return { lean: jest.fn().mockResolvedValue(null) };
        });

        CleaningTask.create.mockResolvedValue({ _id: "task-created" });
        Cleaner.findByIdAndUpdate.mockResolvedValue({});
        Toilet.findByIdAndUpdate.mockResolvedValue({});

        await autoAssignHighRiskTasks(req, res);

        expect(CleaningTask.create).toHaveBeenCalledTimes(1);
        expect(CleaningTask.create).toHaveBeenCalledWith(
            expect.objectContaining({ toilet: "toilet-ok", cleaner: "cleaner-1" })
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
