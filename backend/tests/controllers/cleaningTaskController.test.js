jest.mock("../../server/models/CleaningTask", () => ({
    findOne: jest.fn(),
    create: jest.fn(),
}));

jest.mock("../../server/models/Cleaner", () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
}));

jest.mock("../../server/models/Toilet", () => ({}));

jest.mock("../../server/services/photoAiService", () => ({
    analyzePhotoImprovement: jest.fn(),
}));

jest.mock("../../server/services/notificationService", () => ({
    sendAdminCleaningNotification: jest.fn(),
}));

const CleaningTask = require("../../server/models/CleaningTask");
const { createCleaningTask } = require("../../server/controllers/cleaningTaskController");

const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("cleaningTaskController.createCleaningTask", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns 409 when duplicate open task exists for same toilet", async () => {
        const req = { body: { toilet: "toilet-1", cleaner: "cleaner-1" } };
        const res = createRes();

        const Cleaner = require("../../server/models/Cleaner");
        Cleaner.findById.mockResolvedValue({ _id: "cleaner-1", status: "available" });
        CleaningTask.findOne.mockResolvedValue({ _id: "open-task" });

        await createCleaningTask(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "An open cleaning task already exists for this toilet." })
        );
        expect(CleaningTask.create).not.toHaveBeenCalled();
    });
});
