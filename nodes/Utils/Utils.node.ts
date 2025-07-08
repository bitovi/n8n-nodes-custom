import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import Ajv from 'ajv';
import { set } from 'lodash';

enum Action {
	SKIP = 'skip',
	VALIDATE_SCHEMA = 'validateSchema',
}

export class Utils implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Utils',
		icon: 'file:bitovi.svg',
		name: 'utils',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Utils Node',
		defaults: {
			name: 'Utils',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Skip',
						value: Action.SKIP,
					},
					{
						name: 'Validate Against Schema',
						value: Action.VALIDATE_SCHEMA,
					},
				],
				default: 'validateSchema',
			},
			{
				displayName: 'Items',
				name: 'items',
				type: 'number',
				noDataExpression: false,
				required: true,
				default: 1,
				displayOptions: {
					show: {
						operation: [Action.SKIP],
					},
				},
			},
			{
				displayName: 'Input Schema',
				name: 'inputSchema',
				type: 'json',
				noDataExpression: false,
				typeOptions: {
					rows: 10,
				},
				required: true,
				default: `{
  "type": "object",
  "properties": {
    "state": {
      "type": "string"
    },
    "cities": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  }
}`,
				displayOptions: {
					show: {
						operation: [Action.VALIDATE_SCHEMA],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0) as Action;

		if (operation === Action.SKIP) {
			const skip = this.getNodeParameter('items', 0) as number;

			return [items.splice(skip)];
		}

		for (let i = 0; i < items.length; i++) {
			switch (operation) {
				case Action.VALIDATE_SCHEMA: {
					const schema = JSON.parse(this.getNodeParameter('inputSchema', i) as string);

					const ajv = new Ajv();
					const validate = ajv.compile(schema);

					try {
						const valid = validate(items[i].json);

						if (!valid) {
							throw new NodeOperationError(
								this.getNode(),
								`Input data does not match schema: ${ajv.errorsText(validate.errors)}`,
								{ itemIndex: i },
							);
						}

						returnData.push(items[i]);
					} catch (error) {
						if (!this.continueOnFail()) {
							set(error, 'node', this.getNode());
							throw error;
						}
						returnData.push({ json: { error: error.message, errors: validate.errors }, error });
					}

					break;
				}
				default: {
					// Do nothing
				}
			}
		}

		return [returnData];
	}
}
