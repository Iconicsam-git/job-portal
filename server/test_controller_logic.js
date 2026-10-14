import assert from 'assert';
import { ChangeJobApplicationsStatus, retryApplicationNotification } from './controllers/companyController.js';
import { setMockTransporter } from './utils/emailService.js';
import mongoose from 'mongoose';

console.log('====================================================');
console.log('🧪 RUNNING CONTROLLER LOGIC & VALIDATION TESTS');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

const runTest = async (name, fn) => {
    try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   ${err.message}\n`);
        failed++;
    }
};

(async () => {
    // TEST 1: Missing Application ID or Status returns 400
    await runTest('Rejects missing id or status with 400', async () => {
        let statusCode = 200;
        let responseJson = null;

        const req = {
            body: { id: '', status: '' },
            company: { _id: new mongoose.Types.ObjectId() }
        };
        const res = {
            status: (code) => { statusCode = code; return res; },
            json: (data) => { responseJson = data; return res; }
        };

        await ChangeJobApplicationsStatus(req, res);
        assert.strictEqual(statusCode, 400);
        assert.strictEqual(responseJson.success, false);
    });

    // TEST 2: Invalid status rejected with 400
    await runTest('Rejects unsupported status with 400', async () => {
        let statusCode = 200;
        let responseJson = null;

        const req = {
            body: { id: new mongoose.Types.ObjectId(), status: 'NonExistentStatus' },
            company: { _id: new mongoose.Types.ObjectId() }
        };
        const res = {
            status: (code) => { statusCode = code; return res; },
            json: (data) => { responseJson = data; return res; }
        };

        await ChangeJobApplicationsStatus(req, res);
        assert.strictEqual(statusCode, 400);
        assert.strictEqual(responseJson.success, false);
        assert.ok(responseJson.message.includes('Invalid application status'));
    });

    // TEST 3: Shortlisting without interview date/time/format rejected with 400
    await runTest('Rejects Shortlisted for Interview when interview details are missing', async () => {
        let statusCode = 200;
        let responseJson = null;

        // Mock JobApplication findById returning an application
        const mockCompanyId = new mongoose.Types.ObjectId();
        const mockApp = {
            _id: new mongoose.Types.ObjectId(),
            companyId: { _id: mockCompanyId, name: 'Test Corp', email: 'test@corp.com' },
            userId: { name: 'Alice', email: 'alice@test.com' },
            jobId: { title: 'Software Engineer' },
            status: 'Pending',
            save: async () => {}
        };

        const originalFindById = mongoose.Model.findById;
        mongoose.Model.findById = function() {
            return {
                populate: function() {
                    return {
                        populate: function() {
                            return {
                                populate: function() {
                                    return Promise.resolve(mockApp);
                                }
                            };
                        }
                    };
                }
            };
        };

        try {
            const req = {
                body: {
                    id: mockApp._id.toString(),
                    status: 'Shortlisted for Interview',
                    interviewDetails: {
                        interviewDate: '',
                        interviewTime: '',
                        interviewFormat: ''
                    }
                },
                company: { _id: mockCompanyId }
            };
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { responseJson = data; return res; }
            };

            await ChangeJobApplicationsStatus(req, res);
            assert.strictEqual(statusCode, 400);
            assert.strictEqual(responseJson.success, false);
            assert.ok(responseJson.message.includes('mandatory when shortlisting'));
        } finally {
            mongoose.Model.findById = originalFindById;
        }
    });

    // TEST 4: Online format requires meeting link
    await runTest('Rejects Online interview format when meeting link is empty', async () => {
        let statusCode = 200;
        let responseJson = null;

        const mockCompanyId = new mongoose.Types.ObjectId();
        const mockApp = {
            _id: new mongoose.Types.ObjectId(),
            companyId: { _id: mockCompanyId, name: 'Test Corp', email: 'test@corp.com' },
            userId: { name: 'Alice', email: 'alice@test.com' },
            jobId: { title: 'Software Engineer' },
            status: 'Pending',
            save: async () => {}
        };

        const originalFindById = mongoose.Model.findById;
        mongoose.Model.findById = function() {
            return {
                populate: function() {
                    return {
                        populate: function() {
                            return {
                                populate: function() {
                                    return Promise.resolve(mockApp);
                                }
                            };
                        }
                    };
                }
            };
        };

        try {
            const req = {
                body: {
                    id: mockApp._id.toString(),
                    status: 'Shortlisted for Interview',
                    interviewDetails: {
                        interviewDate: '2026-10-28',
                        interviewTime: '15:00',
                        interviewFormat: 'Online',
                        interviewLocation: '' // empty link
                    }
                },
                company: { _id: mockCompanyId }
            };
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { responseJson = data; return res; }
            };

            await ChangeJobApplicationsStatus(req, res);
            assert.strictEqual(statusCode, 400);
            assert.strictEqual(responseJson.success, false);
            assert.ok(responseJson.message.includes('meeting link is required for online interviews'));
        } finally {
            mongoose.Model.findById = originalFindById;
        }
    });

    // TEST 5: In-person format requires office/location address
    await runTest('Rejects In-person interview format when location address is empty', async () => {
        let statusCode = 200;
        let responseJson = null;

        const mockCompanyId = new mongoose.Types.ObjectId();
        const mockApp = {
            _id: new mongoose.Types.ObjectId(),
            companyId: { _id: mockCompanyId, name: 'Test Corp', email: 'test@corp.com' },
            userId: { name: 'Alice', email: 'alice@test.com' },
            jobId: { title: 'Software Engineer' },
            status: 'Pending',
            save: async () => {}
        };

        const originalFindById = mongoose.Model.findById;
        mongoose.Model.findById = function() {
            return {
                populate: function() {
                    return {
                        populate: function() {
                            return {
                                populate: function() {
                                    return Promise.resolve(mockApp);
                                }
                            };
                        }
                    };
                }
            };
        };

        try {
            const req = {
                body: {
                    id: mockApp._id.toString(),
                    status: 'Shortlisted for Interview',
                    interviewDetails: {
                        interviewDate: '2026-10-28',
                        interviewTime: '15:00',
                        interviewFormat: 'In-person',
                        interviewLocation: '   ' // whitespace only
                    }
                },
                company: { _id: mockCompanyId }
            };
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { responseJson = data; return res; }
            };

            await ChangeJobApplicationsStatus(req, res);
            assert.strictEqual(statusCode, 400);
            assert.strictEqual(responseJson.success, false);
            assert.ok(responseJson.message.includes('interview location is required for in-person interviews'));
        } finally {
            mongoose.Model.findById = originalFindById;
        }
    });

    // TEST 6: Unauthorized recruiter cannot modify someone else's application
    await runTest('Rejects unauthorized company trying to change applicant status with 403', async () => {
        let statusCode = 200;
        let responseJson = null;

        const ownerCompanyId = new mongoose.Types.ObjectId();
        const attackerCompanyId = new mongoose.Types.ObjectId();

        const mockApp = {
            _id: new mongoose.Types.ObjectId(),
            companyId: { _id: ownerCompanyId, name: 'Legit Company' },
            userId: { name: 'Alice', email: 'alice@test.com' },
            jobId: { title: 'Designer' },
            status: 'Pending',
            save: async () => {}
        };

        const originalFindById = mongoose.Model.findById;
        mongoose.Model.findById = function() {
            return {
                populate: function() {
                    return {
                        populate: function() {
                            return {
                                populate: function() {
                                    return Promise.resolve(mockApp);
                                }
                            };
                        }
                    };
                }
            };
        };

        try {
            const req = {
                body: {
                    id: mockApp._id.toString(),
                    status: 'Rejected'
                },
                company: { _id: attackerCompanyId }
            };
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { responseJson = data; return res; }
            };

            await ChangeJobApplicationsStatus(req, res);
            assert.strictEqual(statusCode, 403);
            assert.strictEqual(responseJson.success, false);
            assert.ok(responseJson.message.includes('Unauthorized'));
        } finally {
            mongoose.Model.findById = originalFindById;
        }
    });

    // TEST 7: Valid Shortlisting updates status, saves interview details, and sends email
    await runTest('Successful Shortlisting updates status and sends email with details', async () => {
        let statusCode = 200;
        let responseJson = null;
        let sentEmail = null;

        setMockTransporter({
            sendMail: async (options) => {
                sentEmail = options;
                return { messageId: 'shortlist-email-id-999' };
            }
        });

        const mockCompanyId = new mongoose.Types.ObjectId();
        const mockApp = {
            _id: new mongoose.Types.ObjectId(),
            companyId: { _id: mockCompanyId, name: 'Awesome Corp', email: 'hire@awesome.com' },
            userId: { name: 'Samantha Vance', email: 'samantha@example.com' },
            jobId: { title: 'Lead Architect' },
            status: 'Pending',
            notificationHistory: [],
            save: async () => {}
        };

        const originalFindById = mongoose.Model.findById;
        mongoose.Model.findById = function() {
            return {
                populate: function() {
                    return {
                        populate: function() {
                            return {
                                populate: function() {
                                    return Promise.resolve(mockApp);
                                }
                            };
                        }
                    };
                }
            };
        };

        try {
            const req = {
                body: {
                    id: mockApp._id.toString(),
                    status: 'Shortlisted for Interview',
                    interviewDetails: {
                        interviewDate: '2026-11-05',
                        interviewTime: '13:00',
                        interviewFormat: 'Online',
                        interviewLocation: 'https://meet.google.com/test-meet',
                        interviewNotes: 'Be prepared for a live pairing session.'
                    }
                },
                company: { _id: mockCompanyId, name: 'Awesome Corp', email: 'hire@awesome.com' }
            };
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { responseJson = data; return res; }
            };

            await ChangeJobApplicationsStatus(req, res);

            assert.strictEqual(statusCode, 200);
            assert.strictEqual(responseJson.success, true);
            assert.strictEqual(mockApp.status, 'Shortlisted for Interview');
            assert.strictEqual(mockApp.notificationStatus, 'Sent');
            assert.ok(sentEmail, 'Email should have been dispatched');
            assert.strictEqual(sentEmail.to, 'samantha@example.com');
            assert.ok(sentEmail.text.includes('https://meet.google.com/test-meet'));
            assert.ok(sentEmail.text.includes('Be prepared for a live pairing session.'));
        } finally {
            mongoose.Model.findById = originalFindById;
        }
    });

    console.log('\n====================================================');
    console.log(`🏁 CONTROLLER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
})();
