import type { Product } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { ActionFunction, LinksFunction, LoaderFunction, TypedResponse} from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useSearchParams } from '@remix-run/react';
import { db } from '~/db.server';
import styles from '~/styles/main.css';

export const links: LinksFunction = () => [{ href: styles, rel: 'stylesheet' }];

interface ActionResponse {
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

const handleAdd = async (formData: FormData): Promise<TypedResponse<ActionResponse | never>> => {
  const name = formData.get('name');
  const expiryDate = formData.get('expiryDate');
  const errors: [string, string][] = [];

  if (typeof name !== 'string' || name.length === 0) {
    errors.push(['name', 'Missing or invalid name']);
  }

  if (typeof expiryDate !== 'string' || expiryDate.length === 0) {
    errors.push(['expiryDate', 'Missing or invalid expiry date']);
  }

  if (errors.length > 0) {
    return json({ errors: Object.fromEntries(errors), values: Object.fromEntries(formData) });
  }

  try {
    await db.product.create({ data: { expiryDate: new Date(expiryDate as string), name: `${name}` } });

    return redirect('/');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return json({ errors: { name: 'Name already exists', values: Object.fromEntries(formData) } });
    }

    console.error(error);

    return json({ errors: { _: 'An unknown error occured', values: Object.fromEntries(formData) } }, { status: 500 });
  }
}

const handleDelete = async (formData: FormData): Promise<TypedResponse<never>> => {
  const rowId = formData.get('row-id');

  if (typeof rowId !== 'string' || rowId.length === 0) {
    return null as never;
  }

  await db.product.delete({ where: { id: Number(rowId) } });

  return redirect('/');
};

export const action: ActionFunction = async ({ request }): Promise<TypedResponse<ActionResponse | never>> => {
  const formData = await request.formData();

  switch (formData.get('formName')) {
    case 'add':
      return handleAdd(formData);
    case 'delete':
      return handleDelete(formData);
    default:
      throw new Error('Invalid form name');
  }
};

export const loader: LoaderFunction = async () => {
  return json(await db.product.findMany());
};

export default function Index() {
  const [searchParams] = useSearchParams();
  const products = useLoaderData<Array<Product>>();
  const actionData = useActionData<ActionResponse | never>();

  return (
    <>
      <header>
        <Link to={{ search: 'request_add=true' }}>Add Item</Link>
      </header>
      <main>
        <Form method="delete" reloadDocument>
          <input type="hidden" name="formName" value="delete" />

          <ul id="product-list">
            {products.map(({ expiryDate, id, name }) => (
              <li key={id}>
                <h2>{name}</h2> [{new Date(expiryDate).toLocaleDateString()}]
                <button name="row-id" value={id.toString()} type="submit">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </Form>
      </main>

      {searchParams.get('request_add') && (
        <div className="modal">
          <Form method="post" reloadDocument>
            <h1>Add a product</h1>

            <p>
              <label htmlFor="name">Name</label>
              <input
                defaultValue={actionData?.values?.name}
                id="name"
                name="name"
                required
                type="text"
              />
            </p>
            {actionData?.errors?.name && <p>{actionData.errors.name}</p>}

            <p>
              <label htmlFor="expiryDate">Expires on</label>
              <input id="expiryDate" name="expiryDate" required type="date" />
            </p>
            {actionData?.errors?.expiryDate && <p>{actionData.errors.expiryDate}</p>}

            {actionData?.errors?._ && <p>{actionData.errors._}</p>}

            <Link to={{ search: '' }}>Cancel</Link>
            <button name="formName" type="submit" value="add">Add</button>
          </Form>
        </div>
      )}
    </>
  );
}
