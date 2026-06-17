import type { Meta, StoryObj } from '@storybook/react';
import ProgressBar from './ProgressBar';

const meta = {
    title: 'UI/ProgressBar',
    component: ProgressBar,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        value: {
            control: { type: 'range', min: 0, max: 100, step: 1 },
        },
        showLabel: {
            control: 'boolean',
        },
    },
    decorators: [
        (Story) => (
            <div style={{ width: '400px' }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: {
        value: 0,
        showLabel: true,
    },
};

export const Quarter: Story = {
    args: {
        value: 25,
        showLabel: true,
    },
};

export const Half: Story = {
    args: {
        value: 50,
        showLabel: true,
    },
};

export const ThreeQuarters: Story = {
    args: {
        value: 75,
        showLabel: true,
    },
};

export const Complete: Story = {
    args: {
        value: 100,
        showLabel: true,
    },
};

export const WithoutLabel: Story = {
    args: {
        value: 60,
        showLabel: false,
    },
};

export const MultipleProgress: Story = {
    render: () => (
        <div className="space-y-4" style={{ width: '400px' }}>
            <div>
                <p className="text-sm text-gray-600 mb-2">Project 1</p>
                <ProgressBar value={25} showLabel />
            </div>
            <div>
                <p className="text-sm text-gray-600 mb-2">Project 2</p>
                <ProgressBar value={50} showLabel />
            </div>
            <div>
                <p className="text-sm text-gray-600 mb-2">Project 3</p>
                <ProgressBar value={75} showLabel />
            </div>
            <div>
                <p className="text-sm text-gray-600 mb-2">Project 4</p>
                <ProgressBar value={100} showLabel />
            </div>
        </div>
    ),
};
