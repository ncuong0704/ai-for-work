import { getCategories } from "@/lib/settings";
import { PostEditor } from "@/components/editor/post-editor";
export default async function NewPost() {
  return <PostEditor post={null} categories={await getCategories()} />;
}
