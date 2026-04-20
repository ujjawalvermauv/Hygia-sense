jest.mock("../../server/models/CleaningTask", () => ({
    findOne: jest.fn(),
    create: jest.fn(),
}));

jest.mock("../../server/models/Toilet", () => ({
    findById: jest.fn(),
}));

jest.mock("../../server/models/Cleaner", () => ({
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
}));

jest.mock("../../server/services/notificationService", () => ({
    sendAdminCleaningNotification: jest.fn(),
}));

const CleaningTask = require("../../server/models/CleaningTask");
const Toilet = require("../../server/models/Toilet");
const Cleaner = require("../../server/models/Cleaner");
const { assignTask } = require("../../server/controllers/adminTaskController");

const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("adminTaskController.assignTask", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns 409 when open task already exists for toilet", async () => {
        const req = { body: { toiletId: "toilet-1", cleanerId: "cleaner-1" } };
        const res = createRes();

        CleaningTask.findOne.mockReturnValue({
            populate: jest.fn().mockResolvedValue({ cleaner: { name: "Ravi" } }),
        });

        await assignTask(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining("Open task already exists") })
        );
        expect(CleaningTask.create).not.toHaveBeenCalled();
    });

    test("assigns fallback least-loaded approved active cleaner when cleanerId not provided", async () => {
        const req = { body: { toiletId: "toilet-2" } };
        const res = createRes();

        CleaningTask.findOne.mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
        });

        Toilet.findById.mockResolvedValue({ _id: "toilet-2", name: "Block A" });

        const fallbackCleaner = { _id: "cleaner-low-load", name: "Asha", approvalStatus: "approved", accountStatus: "active" };
        const sortMock = jest.fn().mockResolvedValue(fallbackCleaner);
        Cleaner.findOne.mockReturnValue({ sort: sortMock });

        CleaningTask.create.mockResolvedValue({ _id: "task-1" });
        Cleaner.findByIdAndUpdate.mockResolvedValue({});

        await assignTask(req, res);

        expect(Cleaner.findOne).toHaveBeenCalledWith({
            approvalStatus: { $in: ["approved", null] },
            accountStatus: { $in: ["active", null] },
        });
        expect(sortMock).toHaveBeenCalledWith({ assignedTasks: 1, completedTasks: -1, createdAt: 1 });
        expect(CleaningTask.create).toHaveBeenCalledWith(
            expect.objectContaining({ toilet: "toilet-2", cleaner: "cleaner-low-load", status: "assigned" })
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
