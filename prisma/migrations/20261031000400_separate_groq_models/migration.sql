-- Preserve the current model for both roles when upgrading existing installations.
INSERT INTO "Setting" ("key", "value")
SELECT roles."key", legacy."value"
FROM "Setting" AS legacy
CROSS JOIN (VALUES ('groqWritingModel'), ('groqChatModel')) AS roles("key")
WHERE legacy."key" = 'groqModel'
ON CONFLICT ("key") DO NOTHING;

DELETE FROM "Setting" WHERE "key" = 'groqModel';
