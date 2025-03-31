const fs = require("fs");
const path = require("path");
const { Telegraf } = require("telegraf");
const bot = new Telegraf("7485450093:AAH5hJMgpZbLlGPqtQmetBgULl3zeoxSXV8");

const CHANNEL_ID = "@VCFUPDATESS";
const ADMIN_ID = "7689032393";
const sessions = {};
const users = {};
const redeemCodes = {};

bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const user = await ctx.telegram.getChatMember(CHANNEL_ID, chatId).catch(() => null);
    
    if (!user || ["left", "kicked"].includes(user.status)) {
        return ctx.reply(`🚀 Welcome! To use this bot, you must first join our channel: ${CHANNEL_ID}`);
    }
    
    ctx.reply(`💎 Premium Subscription Plans\n\n🔹 3 Days – $2\n🔹 6 Days – $5\n🔹 14 Days – $12\n\n📌 To Buy a Subscription: Contact @VCFADMIN\n\n🔑 Already have a redeem code? Use the /redeem command to activate your premium access!\n\n🚀 Premium users get:\n✔ Unlimited .txt to .vcf conversion\n✔ Faster processing\n✔ Priority support`);
    sessions[chatId] = { step: "waiting_for_file" };
});

bot.command("redeem", (ctx) => {
    const chatId = ctx.chat.id;
    sessions[chatId] = { step: "waiting_for_redeem" };
    ctx.reply("🔑 Send your redeem code:");
});

bot.command("abiyet", (ctx) => {
    if (ctx.chat.id.toString() === ADMIN_ID) {
        ctx.reply("🛠 Admin Panel\n1️⃣ Generate Redeem Code (/gen_code <days>)\n2️⃣ View Users (/users)\n3️⃣ Remove User (/remove_user <id>)");
    } else {
        ctx.reply("❌ You are not authorized to access the admin panel.");
    }
});

bot.command("gen_code", (ctx) => {
    const args = ctx.message.text.split(" ");
    const days = parseInt(args[1]);
    if ([3, 6, 14].includes(days)) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        redeemCodes[code] = days * 24 * 60 * 60 * 1000;
        ctx.reply(`✅ Redeem Code Generated: ${code} (Valid for ${days} days)`);
    } else {
        ctx.reply("❌ Invalid duration. Use 3, 6, or 14 days.");
    }
});

bot.on("document", async (ctx) => {
    const chatId = ctx.chat.id;
    sessions[chatId] = { step: "waiting_for_filename", fileUrl: await ctx.telegram.getFileLink(ctx.message.document.file_id) };
    ctx.reply("📄 Send the base name for .vcf files (e.g., 'me 1'):");
});

async function processFile(ctx, session) {
    try {
        const response = await fetch(session.fileUrl);
        const text = await response.text();
        const numbers = text.split("\n").map(num => num.trim()).filter(num => num);
        
        if (numbers.length === 0) {
            return ctx.reply("❌ No valid phone numbers found in the file.");
        }
        
        const outputDir = path.join(__dirname, "output");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        
        let fileCount = 1;
        let numIndex = 0;
        
        for (let i = 0; i < session.numFiles; i++) {
            const vcfFileName = `${session.filename} ${fileCount}.vcf`;
            const vcfFilePath = path.join(outputDir, vcfFileName);
            const vcfStream = fs.createWriteStream(vcfFilePath);
            
            for (let j = 0; j < session.numContacts; j++) {
                if (numIndex >= numbers.length) break;
                const contactName = `${session.contactPrefix} ${numIndex + 1}`;
                vcfStream.write(`BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\nTEL:${numbers[numIndex]}\nEND:VCARD\n`);
                numIndex++;
            }
            
            vcfStream.end();
            fileCount++;
            await ctx.replyWithDocument({ source: vcfFilePath });
        }
        
        ctx.reply("✅ Conversion complete!");
    } catch (error) {
        console.error(error);
        ctx.reply("❌ An error occurred while processing the file.");
    }
}

bot.launch();
