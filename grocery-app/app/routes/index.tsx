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

export const action: ActionFunction = async ({ request }): Promise<TypedResponse<ActionResponse | never>> => {
  const formData = await request.formData();
  const name = formData.get('name');

  if (typeof name !== 'string' || name.length === 0) {
    return json({ errors: { name: 'Missing or invalid name' }, values: Object.fromEntries(formData) });
  }

  try {
    await db.product.create({ data: { name } });

    return redirect('/');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return json({ errors: { name: 'Name already exists', values: Object.fromEntries(formData) } });
    }

    return json({ errors: { _: 'An unknown error occured', values: Object.fromEntries(formData) } }, { status: 500 });
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
        <ul id="product-list">
          {products.map(({ name }) => <li key={name}>{name}</li>)}
        </ul>
      </main>
      {searchParams.get('request_add') && (
        <div className="modal">
          <Form method="post">
            <h1>Add a product</h1>
            <p>
              <label htmlFor="name">Name</label>
              <input defaultValue={actionData?.values?.name} id="name" name="name" required type="text" />
            </p>
            {actionData?.errors?.name && <p>{actionData.errors.name}</p>}
            {actionData?.errors?._ && <p>{actionData.errors._}</p>}
            <Link to={{ search: '' }}>Cancel</Link>
            <button type='submit'>Add</button>
          </Form>
        </div>
      )}
    </>
  );
}
