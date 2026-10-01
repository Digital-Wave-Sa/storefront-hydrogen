import {adminApiQuery} from '~/lib/admin.server';

/**
 * Put an image into Shopify Files and return its public CDN link.
 *
 * Staged upload → POST the bytes → `fileCreate`, then wait for Shopify to
 * finish processing: `fileCreate` answers before the image has a URL, and a
 * cart line needs a link the kitchen can open, not a file id. Gives up after
 * about six seconds and returns the id, so nothing is lost — the file is in
 * Settings → Files either way.
 */
export async function uploadImageToFiles(
  shopDomain: string,
  token: string,
  {
    bytes,
    mimeType,
    filename,
    alt,
  }: {bytes: ArrayBuffer; mimeType: string; filename: string; alt: string},
): Promise<{url: string | null; id: string | null}> {
  const staged: any = await adminApiQuery(
    shopDomain,
    token,
    `mutation Stage($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { message }
      }
    }`,
    {
      input: [
        {
          filename,
          mimeType,
          resource: 'IMAGE',
          fileSize: String(bytes.byteLength),
          httpMethod: 'POST',
        },
      ],
    },
  );
  const target = staged?.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target) {
    console.error('[upload-image] No staged target:', JSON.stringify(staged));
    return {url: null, id: null};
  }

  const form = new FormData();
  for (const p of target.parameters || []) form.append(p.name, p.value);
  form.append('file', new Blob([bytes], {type: mimeType}), filename);
  const put = await fetch(target.url, {method: 'POST', body: form});
  if (!put.ok) {
    console.error('[upload-image] Upload failed:', put.status, await put.text());
    return {url: null, id: null};
  }

  const created: any = await adminApiQuery(
    shopDomain,
    token,
    `mutation Create($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id ... on MediaImage { image { url } } }
        userErrors { message }
      }
    }`,
    {files: [{alt, contentType: 'IMAGE', originalSource: target.resourceUrl}]},
  );
  const file = created?.data?.fileCreate?.files?.[0];
  if (!file?.id) {
    console.error('[upload-image] fileCreate failed:', JSON.stringify(created));
    return {url: null, id: null};
  }
  if (file.image?.url) return {url: file.image.url, id: file.id};

  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((r) => setTimeout(r, 600));
    const res: any = await adminApiQuery(
      shopDomain,
      token,
      `query FileUrl($id: ID!) {
        node(id: $id) { ... on MediaImage { fileStatus image { url } } }
      }`,
      {id: file.id},
    );
    const node = res?.data?.node;
    if (node?.image?.url) return {url: node.image.url, id: file.id};
    if (node?.fileStatus === 'FAILED') {
      console.error('[upload-image] Shopify could not process', file.id);
      return {url: null, id: file.id};
    }
  }
  console.warn('[upload-image] Still processing after 6s:', file.id);
  return {url: null, id: file.id};
}
