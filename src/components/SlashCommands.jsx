import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import tippy from 'tippy.js';
import { 
  Heading1, 
  Heading2, 
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Bold,
  Italic,
  Type
} from 'lucide-react';

// 🔍 SLASH COMMAND MENU COMPONENT
const SlashCommandMenu = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    {
      title: 'Heading 1',
      description: 'Big section heading',
      icon: <Heading1 className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 1 })
          .run();
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: <Heading2 className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 2 })
          .run();
      },
    },
    {
      title: 'Heading 3',
      description: 'Small section heading',
      icon: <Heading3 className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 3 })
          .run();
      },
    },
    {
      title: 'Bullet List',
      description: 'Create a simple bullet list',
      icon: <List className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleBulletList()
          .run();
      },
    },
    {
      title: 'Numbered List',
      description: 'Create a numbered list',
      icon: <ListOrdered className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleOrderedList()
          .run();
      },
    },
    {
      title: 'Quote',
      description: 'Capture a quote',
      icon: <Quote className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleBlockquote()
          .run();
      },
    },
    {
      title: 'Code Block',
      description: 'Create a code block',
      icon: <Code className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleCodeBlock()
          .run();
      },
    },
    {
      title: 'Bold',
      description: 'Make text bold',
      icon: <Bold className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent('**bold text**')
          .run();
      },
    },
    {
      title: 'Italic',
      description: 'Make text italic',
      icon: <Italic className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent('*italic text*')
          .run();
      },
    },
    {
      title: 'Text',
      description: 'Just start typing with plain text',
      icon: <Type className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .clearNodes()
          .run();
      },
    },
  ];

  const filteredCommands = commands.filter(command =>
    props.query
      ? command.title.toLowerCase().includes(props.query.toLowerCase()) ||
        command.description.toLowerCase().includes(props.query.toLowerCase())
      : commands
  );

  const selectItem = (index) => {
    const command = filteredCommands[index];
    if (command) {
      command.command(props);
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + filteredCommands.length - 1) % filteredCommands.length
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % filteredCommands.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.query]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1 py-2 shadow-md transition-all">
      {filteredCommands.length > 0 ? (
        filteredCommands.map((command, index) => (
          <button
            key={command.title}
            className={`flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm ${
              index === selectedIndex
                ? 'bg-blue-500 text-white'
                : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => selectItem(index)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {command.icon}
            </div>
            <div>
              <p className="font-medium">{command.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {command.description}
              </p>
            </div>
          </button>
        ))
      ) : (
        <div className="px-2 py-1 text-gray-500 dark:text-gray-400">
          No results found
        </div>
      )}
    </div>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';

// 🔧 SLASH COMMAND EXTENSION
const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

// 🚀 CREATE SLASH COMMAND EXTENSION WITH SUGGESTION
export const createSlashCommandExtension = () => {
  return SlashCommand.configure({
    suggestion: {
      items: ({ query }) => {
        return [
          {
            title: 'Heading 1',
            description: 'Big section heading',
            command: ({ editor, range }) => {
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode('heading', { level: 1 })
                .run();
            },
          },
          {
            title: 'Heading 2',
            description: 'Medium section heading',
            command: ({ editor, range }) => {
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode('heading', { level: 2 })
                .run();
            },
          },
          {
            title: 'Heading 3',
            description: 'Small section heading',
            command: ({ editor, range }) => {
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode('heading', { level: 3 })
                .run();
            },
          },
          {
            title: 'Bullet List',
            description: 'Create a simple bullet list',
            command: ({ editor, range }) => {
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .toggleBulletList()
                .run();
            },
          },
          {
            title: 'Numbered List',
            description: 'Create a numbered list',
            command: ({ editor, range }) => {
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .toggleOrderedList()
                .run();
            },
          },
          {
            title: 'Quote',
            description: 'Capture a quote',
            command: ({ editor, range }) => {
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .toggleBlockquote()
                .run();
            },
          },
          {
            title: 'Code Block',
            description: 'Create a code block',
            command: ({ editor, range }) => {
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .toggleCodeBlock()
                .run();
            },
          },
          {
            title: 'Text',
            description: 'Just start typing with plain text',
            command: ({ editor, range }) => {
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .clearNodes()
                .run();
            },
          },
        ].filter(item =>
          item.title.toLowerCase().includes(query.toLowerCase())
        );
      },
      render: () => {
        let component;
        let popup;

        return {
          onStart: (props) => {
            component = new ReactRenderer(SlashCommandMenu, {
              props,
              editor: props.editor,
            });

            if (!props.clientRect) {
              return;
            }

            popup = tippy('body', {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
            });
          },

          onUpdate(props) {
            component.updateProps(props);

            if (!props.clientRect) {
              return;
            }

            popup[0].setProps({
              getReferenceClientRect: props.clientRect,
            });
          },

          onKeyDown(props) {
            if (props.event.key === 'Escape') {
              popup[0].hide();
              return true;
            }

            return component.ref?.onKeyDown(props);
          },

          onExit() {
            popup[0].destroy();
            component.destroy();
          },
        };
      },
    },
  });
};

export default SlashCommand;
