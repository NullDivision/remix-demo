import type { Product } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { ActionFunction, LinksFunction, LoaderFunction, TypedResponse} from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, useActionData, useFetcher, useLoaderData, useSearchParams } from '@remix-run/react';
import debounce from 'lodash.debounce';
import { useMemo } from 'react';
import { db } from '~/db.server';
import styles from '~/styles/main.css';
import { differenceInCalendarDays } from 'date-fns/fp';

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

const DeleteKey = 'delete';
const OpenedKey = 'opened';

const handleProductListForm = async (formData: FormData): Promise<TypedResponse<never>> => {
  const deleteRowId = formData.get(DeleteKey);
  const openedRowId = formData.get(OpenedKey);

  if (typeof deleteRowId === 'string') {
    await db.product.delete({ where: { id: parseInt(deleteRowId, 10) } });
    return redirect('/');
  }

  if (typeof openedRowId === 'string') {
    await db.product.update({ where: { id: parseInt(openedRowId, 10) }, data: { opened: true } });
    return redirect('/');
  }

  return null as never;
};

const AddFormName = 'addForm';
const ProductListFormName = 'productListForm';

export const action: ActionFunction = async ({ request }): Promise<TypedResponse<ActionResponse>> => {
  const formData = await request.formData();

  switch (formData.get('formName')) {
    case AddFormName:
      return handleAdd(formData);
    case ProductListFormName:
      return handleProductListForm(formData);
    default:
      throw new Error('Invalid form name');
  }
};

export const loader: LoaderFunction = async () => {
  return json(await db.product.findMany());
};

// TODO: add a link to a shopping card
// TODO: be able to set individual items of a product separately (expiration, opened on...)
export default function Index() {
  const [searchParams] = useSearchParams();
  const products = useLoaderData<Array<Product>>();
  const actionData = useActionData<ActionResponse | never>();
  const getDaysRemaining = differenceInCalendarDays(new Date());
  const fetcher = useFetcher<Array<Product>>();
  const handleChange = useMemo(() => debounce(async (event: React.ChangeEvent<HTMLInputElement>) => {
    fetcher.load(`/api/products?search=${event.target.value}`);
  }, 500), [fetcher]);

  return (
    <>
      <header>
        <Link to={{ search: 'request_add=true' }}>Add Item</Link>
      </header>

      <main>
        <Form method='post' reloadDocument>
          <input type='hidden' name='formName' value={ProductListFormName} />

          <ul id='product-list'>
            {products.map(({ expiryDate, id, name, opened }) => (
              <li key={id}>
                <h2 className='product-name'>{name}</h2>[
                {new Date(expiryDate).toLocaleDateString()}]
                {getDaysRemaining(new Date(expiryDate)) <= 7 && '🕑'}
                <div>
                  {!opened && (
                    <button name={OpenedKey} type='submit' value={id}>
                      Open
                    </button>
                  )}
                  <button name={DeleteKey} type='submit' value={id.toString()}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Form>
      </main>

      {searchParams.get('request_add') && (
        <div className='modal'>
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
    </>
  );
}
