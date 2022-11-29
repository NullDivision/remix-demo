import type { Product } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { ActionFunction, LinksFunction, MetaFunction, TypedResponse } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useActionData,
  useFetcher,
  useSearchParams,
} from "@remix-run/react";
import debounce from 'lodash.debounce';
import { useMemo } from 'react';
import styles from '~/styles/main.css';
import { db } from './db.server';

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "New Remix App",
  viewport: "width=device-width,initial-scale=1",
});

export const links: LinksFunction = () => [
  { href: 'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css', rel: 'stylesheet' },
  { href: styles, rel: 'stylesheet' }
];

export const action: ActionFunction = async ({ request }): Promise<TypedResponse<ActionResponse>> => {
  const formData = await request.formData();

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
    await db.pantryProduct.create({
      data: {
        expiryDate: new Date(expiryDate as string),
        product: { connectOrCreate: { create: { name: `${name}` }, where: { name: `${name}` } } }
      }
    });

    return redirect('/pantry');
  } catch (error) {
    console.error(error);

    return json({ errors: { _: 'An unknown error occured', values: Object.fromEntries(formData) } }, { status: 500 });
  }
};

interface ActionResponse {
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

const AddFormName = 'addForm';

const Sidebar = () => {
  const [searchParams] = useSearchParams();
  const actionData = useActionData<ActionResponse | never>();
  const fetcher = useFetcher<Array<Product>>();
  const handleChange = useMemo(() => debounce(async (event: React.ChangeEvent<HTMLInputElement>) => {
    fetcher.load(`/api/products?search=${event.target.value}`);
  }, 500), [fetcher]);

  return (
    <aside>
      <h2>Grocery App</h2>
      <nav>
        <ul>
          <li><Link to="/pantry">Home</Link></li>
          <li><Link to="/products">Products</Link></li>
          <li><Link to="/shopping-list">Shopping List</Link></li>
        </ul>
      </nav>

      <p><Link to={{ search: 'request_add=true' }}>Add Item</Link></p>

      {searchParams.get('request_add') && (
          <div id="add-modal" className='modal'>
            <Form method='post' reloadDocument>
              <h1>Add a product</h1>

              <p>
                <label htmlFor='name'>Name</label>
                <input
                  autoComplete='off'
                  defaultValue={actionData?.values?.name}
                  id='name'
                  list='product-names'
                  name='name'
                  onChange={handleChange}
                  required
                  type='text'
                />
                <datalist id='product-names'>
                  {fetcher.data?.map(({ id, name }) => (
                    <option key={id} value={name}>
                      {name}
                    </option>
                  ))}
                </datalist>
              </p>
              {actionData?.errors?.name && <p>{actionData.errors.name}</p>}

              <p>
                <label htmlFor='expiryDate'>Expires on</label>
                <input id='expiryDate' name='expiryDate' required type='date' />
              </p>
              {actionData?.errors?.expiryDate && (
                <p>{actionData.errors.expiryDate}</p>
              )}

              {actionData?.errors?._ && <p>{actionData.errors._}</p>}

              <Link to={{ search: '' }}>Cancel</Link>
              <button name='formName' type='submit' value={AddFormName}>
                Add
              </button>
            </Form>
          </div>
        )}
    </aside>
  );
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <main>
          <Sidebar />
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
