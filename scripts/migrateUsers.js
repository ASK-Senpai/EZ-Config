"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var admin = __importStar(require("firebase-admin"));
var dotenv = __importStar(require("dotenv"));
var razorpay_1 = __importDefault(require("razorpay"));
// Load environment variables
dotenv.config();
// Initialize Firebase Admin securely handling the newline escape issue
var pk = process.env.FIREBASE_PRIVATE_KEY || "";
pk = pk.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: pk,
        })
    });
}
var db = admin.firestore();
// Initialize Razorpay
var razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_TEST_SECRET || process.env.RAZORPAY_SECRET || ""
});
function migrateUsers() {
    return __awaiter(this, void 0, void 0, function () {
        var usersSnapshot, migratedCount, now, currentMonthKey, _i, _a, doc, data, uid, updates, isPremium, currentAiLimit, currentAiUsage, rzpSub, nextDate, rzpErr_1, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("Starting User Schema Migration...");
                    return [4 /*yield*/, db.collection('users').get()];
                case 1:
                    usersSnapshot = _b.sent();
                    console.log("Found ".concat(usersSnapshot.size, " total users."));
                    migratedCount = 0;
                    now = new Date();
                    currentMonthKey = "".concat(now.getFullYear(), "-").concat(String(now.getMonth() + 1).padStart(2, '0'));
                    _i = 0, _a = usersSnapshot.docs;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 13];
                    doc = _a[_i];
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 11, , 12]);
                    data = doc.data();
                    uid = doc.id;
                    updates = {};
                    console.log("\nAnalyzing user: ".concat(uid, " (").concat(data.email, ")"));
                    // --- 1. REMOVE DEPRECATED FIELDS ---
                    if (data.aiUsageRemaining !== undefined) {
                        updates.aiUsageRemaining = admin.firestore.FieldValue.delete();
                    }
                    if (data.subscriptionId !== undefined) {
                        updates.subscriptionId = admin.firestore.FieldValue.delete();
                    }
                    if (data.subscription !== undefined) {
                        updates.subscription = admin.firestore.FieldValue.delete();
                    }
                    if (data.credits !== undefined) {
                        updates.credits = admin.firestore.FieldValue.delete();
                    }
                    isPremium = data.plan === "premium_monthly" || data.plan === "premium" || data.subscriptionStatus === "active";
                    currentAiLimit = typeof data.aiLimit === 'number' ? data.aiLimit : (isPremium ? 50 : 5);
                    // Enforce limit cap
                    if (isPremium && currentAiLimit < 50)
                        currentAiLimit = 50;
                    if (data.aiLimit !== currentAiLimit)
                        updates.aiLimit = currentAiLimit;
                    currentAiUsage = typeof data.aiUsage === 'number' ? data.aiUsage : 0;
                    // Enforce lower bounds
                    if (currentAiUsage < 0)
                        currentAiUsage = 0;
                    // Enforce upper bounds
                    if (currentAiUsage > currentAiLimit)
                        currentAiUsage = currentAiLimit;
                    if (data.aiUsage !== currentAiUsage)
                        updates.aiUsage = currentAiUsage;
                    if (!(!data.nextBillingDate && data.razorpaySubscriptionId)) return [3 /*break*/, 7];
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, razorpay.subscriptions.fetch(data.razorpaySubscriptionId)];
                case 5:
                    rzpSub = _b.sent();
                    if (rzpSub && rzpSub.current_end) {
                        nextDate = new Date(rzpSub.current_end * 1000).toISOString();
                        updates.nextBillingDate = nextDate;
                        console.log("  -> Fetched nextBillingDate from Razorpay: ".concat(nextDate));
                    }
                    return [3 /*break*/, 7];
                case 6:
                    rzpErr_1 = _b.sent();
                    console.error("  -> Failed to fetch Razorpay sub ".concat(data.razorpaySubscriptionId, ":"), rzpErr_1.message);
                    return [3 /*break*/, 7];
                case 7:
                    // --- 4. FIX RAZORPAY CUSTOMER FIELD ---
                    if (data.razorpayCustomerId === undefined) {
                        updates.razorpayCustomerId = null;
                        // (If needed, you can query Razorpay API by email here, but defaulting to null is safer)
                    }
                    // --- 5. ENSURE reportUsageMonth EXISTS ---
                    if (!data.reportUsageMonth) {
                        updates.reportUsageMonth = currentMonthKey;
                    }
                    if (!(Object.keys(updates).length > 0)) return [3 /*break*/, 9];
                    console.log("  -> Modifications planned:", Object.keys(updates));
                    return [4 /*yield*/, db.collection("users").doc(uid).update(updates)];
                case 8:
                    _b.sent();
                    migratedCount++;
                    console.log("  -> [UPDATED] user ".concat(uid));
                    return [3 /*break*/, 10];
                case 9:
                    console.log("  -> User exactly matches Target Schema already. Skipping.");
                    _b.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    err_1 = _b.sent();
                    console.error("ERROR migrating user ".concat(doc.id, ":"), err_1);
                    return [3 /*break*/, 12];
                case 12:
                    _i++;
                    return [3 /*break*/, 2];
                case 13:
                    console.log("\nMigration complete. Analyzed ".concat(usersSnapshot.size, " total users."));
                    console.log("Dry-run matched ".concat(migratedCount, " users requiring changes."));
                    return [2 /*return*/];
            }
        });
    });
}
migrateUsers()
    .then(function () { return process.exit(0); })
    .catch(console.error);
