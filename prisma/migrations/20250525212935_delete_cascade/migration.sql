-- DropForeignKey
ALTER TABLE "topics" DROP CONSTRAINT "topics_categoryId_fkey";

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
