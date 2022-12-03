import type { Product } from '@prisma/client';
import type { ActionFunction, LoaderFunction, TypedResponse } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useActionData, useLoaderData } from '@remix-run/react';
import { db } from '~/db.server';

interface ActionData { errors: { externalImage: string }; values: { externalImage: string }; }

export const action: ActionFunction = async ({ params, request }): Promise<TypedResponse<ActionData> | null> => {
	const formData = await request.formData();
	const externalImage = formData.get('externalImage');

	if (!params.productId) {
		throw new Error('Invalid product ID');
	}

	if (typeof externalImage !== 'string') {
		return json({
			errors: { externalImage: "Missing or invalid external image" },
			values: Object.fromEntries(formData),
		});
	}

	await db.product.update({ data: { externalImage: externalImage }, where: { id: parseInt(params.productId, 10) } });

	return null;
};

export const loader: LoaderFunction = async ({ params }) => {
	if (!params.productId) {
		throw new Error('No product ID provided');
	}

	return db.product.findUnique({ where: { id: parseInt(params.productId, 10) } });
};

export default function ProductId() {
	const actionData = useActionData<ActionData>();
	const data = useLoaderData<Product>();

	if (!data) return null;

	return (
		<div className="modal">
			<h2>{data.name}</h2>

			<form encType="multipart/form-data" method="post">
				<label htmlFor="externalImage">External Image</label>
				<input
					defaultValue={actionData?.errors.externalImage ?? data.externalImage ?? ''}
					id="externalImage"
					name="externalImage"
					type="text"
				/>
				{!!actionData?.errors.externalImage && (
					<p>{actionData?.errors.externalImage}</p>
				)}

				<button type="submit">Save</button>
			</form>
		</div>
	);
}
