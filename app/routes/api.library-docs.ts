import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { getDocumentById, listAvailableDocuments } from '~/lib/common/llms-docs';

export async function action({ request }: ActionFunctionArgs) {
  const { libraryId } = await request.json<{
    libraryId?: string;
  }>();

  // If no libraryId provided, return a list of available libraries
  if (!libraryId) {
    const libraries = listAvailableDocuments().map((id) => {
      const doc = getDocumentById(id);
      return {
        id,
        name: doc?.name || id,
      };
    });

    return json({ libraries });
  }

  // Get the documentation for the requested library
  const doc = getDocumentById(libraryId);

  if (!doc) {
    return json({ error: `Library '${libraryId}' not found` }, { status: 404 });
  }

  return json({
    id: doc.id,
    name: doc.name,
    content: doc.content,
  });
}

export async function loader() {
  const libraries = listAvailableDocuments().map((id) => {
    const doc = getDocumentById(id);
    return {
      id,
      name: doc?.name || id,
    };
  });

  return json({ libraries });
}