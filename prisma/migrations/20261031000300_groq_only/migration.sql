-- Retire the removed provider without changing content or the existing Groq settings.
DELETE FROM "Setting" WHERE "key" IN ('geminiKey', 'geminiModel');
