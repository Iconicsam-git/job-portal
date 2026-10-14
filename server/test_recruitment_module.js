import assert from 'assert';
import {
    sendShortlistingEmail,
    sendRejectionEmail,
    sendHiredEmail,
    sendUnderReviewEmail,
    dispatchApplicationEmail,
    setMockTransporter
} from './utils/emailService.js';

console.log('====================================================');
console.log('🧪 RUNNING AUTOMATED TESTS FOR RECRUITMENT MODULE');
console.log('====================================================\n');

let testsPassed = 0;
let testsFailed = 0;

const runTest = async (testName, testFn) => {
    try {
        await testFn();
        console.log(`✅ PASS: ${testName}`);
        testsPassed++;
    } catch (err) {
        console.error(`❌ FAIL: ${testName}`);
        console.error(`   Error: ${err.message}\n`);
        testsFailed++;
    }
};

(async () => {
    // ----------------------------------------------------
    // TEST 1: Mock Transporter Delivery Verification
    // ----------------------------------------------------
    await runTest('Email service dispatches via mock transporter', async () => {
        let sentMailOptions = null;
        setMockTransporter({
            sendMail: async (options) => {
                sentMailOptions = options;
                return { messageId: 'test-msg-12345' };
            }
        });

        const result = await sendShortlistingEmail({
            candidateName: 'Jane Doe',
            candidateEmail: 'jane.doe@example.com',
            jobTitle: 'Senior Full Stack Engineer',
            companyName: 'Acme Technologies',
            companyEmail: 'careers@acme.com',
            interviewDetails: {
                interviewDate: '2026-10-25',
                interviewTime: '14:30',
                interviewFormat: 'Online',
                interviewLocation: 'https://meet.google.com/abc-defg-hij',
                interviewNotes: 'Please review the system architecture documentation beforehand.'
            }
        });

        assert.strictEqual(result.success, true, 'Email dispatch must succeed');
        assert.strictEqual(result.messageId, 'test-msg-12345', 'Should return messageId from transporter');
        assert.ok(sentMailOptions, 'Transporter must receive mail options');
        assert.strictEqual(sentMailOptions.to, 'jane.doe@example.com', 'Recipient should match candidate email');
        assert.ok(sentMailOptions.subject.includes('Senior Full Stack Engineer'), 'Subject must contain JobTitle');
        assert.ok(sentMailOptions.text.includes('2026-10-25'), 'Text body must contain interview date');
        assert.ok(sentMailOptions.text.includes('14:30'), 'Text body must contain interview time');
        assert.ok(sentMailOptions.text.includes('Online'), 'Text body must contain interview format');
        assert.ok(sentMailOptions.text.includes('https://meet.google.com/abc-defg-hij'), 'Text body must contain meeting link');
        assert.ok(sentMailOptions.text.includes('careers@acme.com'), 'Text body must contain company contact email');
    });

    // ----------------------------------------------------
    // TEST 2: Template Handles Optional Fields Gracefully
    // ----------------------------------------------------
    await runTest('Shortlisting template contains no "undefined" with empty notes', async () => {
        let sentMailOptions = null;
        setMockTransporter({
            sendMail: async (options) => {
                sentMailOptions = options;
                return { messageId: 'test-msg-graceful' };
            }
        });

        await sendShortlistingEmail({
            candidateName: '',
            candidateEmail: 'candidate@example.com',
            jobTitle: '',
            companyName: '',
            companyEmail: '',
            interviewDetails: {
                interviewDate: '2026-10-30',
                interviewTime: '11:00',
                interviewFormat: 'In-person',
                interviewLocation: '123 Innovation Drive, Floor 4',
                interviewNotes: '' // empty notes
            }
        });

        assert.ok(!sentMailOptions.text.includes('undefined'), 'Text body must not contain "undefined"');
        assert.ok(!sentMailOptions.html.includes('undefined'), 'HTML body must not contain "undefined"');
        assert.ok(sentMailOptions.text.includes('123 Innovation Drive'), 'Location must be displayed');
    });

    // ----------------------------------------------------
    // TEST 3: Rejection Email Template Validation
    // ----------------------------------------------------
    await runTest('Rejection email sends polite, respectful content without internal scores', async () => {
        let sentMailOptions = null;
        setMockTransporter({
            sendMail: async (options) => {
                sentMailOptions = options;
                return { messageId: 'test-reject-id' };
            }
        });

        const result = await sendRejectionEmail({
            candidateName: 'Alex Smith',
            candidateEmail: 'alex@example.com',
            jobTitle: 'Product Designer',
            companyName: 'DesignCorp',
            companyEmail: 'jobs@designcorp.com'
        });

        assert.strictEqual(result.success, true);
        assert.ok(sentMailOptions.text.includes('Alex Smith'));
        assert.ok(sentMailOptions.text.includes('Product Designer'));
        assert.ok(sentMailOptions.text.includes('DesignCorp'));
        assert.ok(sentMailOptions.text.includes('future opportunities'));
        assert.ok(!sentMailOptions.text.includes('suitabilityScore'), 'Internal scoring must not leak');
    });

    // ----------------------------------------------------
    // TEST 4: Hired Email Template Validation
    // ----------------------------------------------------
    await runTest('Hired email sends congratulatory confirmation', async () => {
        let sentMailOptions = null;
        setMockTransporter({
            sendMail: async (options) => {
                sentMailOptions = options;
                return { messageId: 'test-hired-id' };
            }
        });

        const result = await sendHiredEmail({
            candidateName: 'Taylor Swift',
            candidateEmail: 'taylor@example.com',
            jobTitle: 'Creative Director',
            companyName: 'Studio Global',
            companyEmail: 'recruitment@studio.com'
        });

        assert.strictEqual(result.success, true);
        assert.ok(sentMailOptions.text.includes('Congratulations!'));
        assert.ok(sentMailOptions.text.includes('Creative Director'));
        assert.ok(sentMailOptions.text.includes('Studio Global'));
    });

    // ----------------------------------------------------
    // TEST 5: Under Review Email Template Validation
    // ----------------------------------------------------
    await runTest('Under Review email sends acknowledgment', async () => {
        let sentMailOptions = null;
        setMockTransporter({
            sendMail: async (options) => {
                sentMailOptions = options;
                return { messageId: 'test-review-id' };
            }
        });

        const result = await sendUnderReviewEmail({
            candidateName: 'Sam Developer',
            candidateEmail: 'sam@example.com',
            jobTitle: 'Backend Engineer',
            companyName: 'Cloud Systems',
            companyEmail: 'hr@cloudsystems.com'
        });

        assert.strictEqual(result.success, true);
        assert.ok(sentMailOptions.text.includes('Under Review'));
        assert.ok(sentMailOptions.text.includes('Backend Engineer'));
    });

    // ----------------------------------------------------
    // TEST 6: Email Service Error Handling Resilience
    // ----------------------------------------------------
    await runTest('Email service handles SMTP failure gracefully without crashing', async () => {
        setMockTransporter({
            sendMail: async () => {
                throw new Error('Connection timeout to SMTP host');
            }
        });

        const result = await sendShortlistingEmail({
            candidateName: 'Failing Candidate',
            candidateEmail: 'fail@example.com',
            jobTitle: 'DevOps Specialist',
            companyName: 'Tech Infra',
            interviewDetails: {
                interviewDate: '2026-11-01',
                interviewTime: '10:00',
                interviewFormat: 'Online',
                interviewLocation: 'https://meet.google.com/test'
            }
        });

        assert.strictEqual(result.success, false, 'Result must report failure');
        assert.ok(result.error.includes('Connection timeout'), 'Error must contain failure message');
    });

    // ----------------------------------------------------
    // TEST 7: Invalid Email Validation
    // ----------------------------------------------------
    await runTest('Email service validates recipient email format', async () => {
        const result = await sendShortlistingEmail({
            candidateName: 'Bad Email Candidate',
            candidateEmail: 'not-an-email',
            jobTitle: 'QA Lead',
            companyName: 'Quality Inc'
        });

        assert.strictEqual(result.success, false);
        assert.ok(result.error.includes('Invalid or missing recipient email'));
    });

    // ----------------------------------------------------
    // TEST 8: Dispatcher Routes Statuses Correctly
    // ----------------------------------------------------
    await runTest('Master dispatcher routes statuses properly', async () => {
        let lastAction = null;
        setMockTransporter({
            sendMail: async (options) => {
                lastAction = options.subject;
                return { messageId: 'dispatch-id' };
            }
        });

        await dispatchApplicationEmail({
            status: 'Shortlisted for Interview',
            candidateName: 'Bob',
            candidateEmail: 'bob@example.com',
            jobTitle: 'Frontend Dev',
            companyName: 'Web Solutions',
            interviewDetails: {
                interviewDate: '2026-11-10',
                interviewTime: '09:00',
                interviewFormat: 'Online',
                interviewLocation: 'https://zoom.us/j/123456789'
            }
        });
        assert.ok(lastAction.includes('Shortlisted'), 'Should route to shortlisting email');

        await dispatchApplicationEmail({
            status: 'Hired',
            candidateName: 'Bob',
            candidateEmail: 'bob@example.com',
            jobTitle: 'Frontend Dev',
            companyName: 'Web Solutions'
        });
        assert.ok(lastAction.includes('Offer'), 'Should route to offer email');

        await dispatchApplicationEmail({
            status: 'Rejected',
            candidateName: 'Bob',
            candidateEmail: 'bob@example.com',
            jobTitle: 'Frontend Dev',
            companyName: 'Web Solutions'
        });
        assert.ok(lastAction.includes('Application'), 'Should route to rejection email');
    });

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`🏁 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('====================================================\n');

    if (testsFailed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
})();
