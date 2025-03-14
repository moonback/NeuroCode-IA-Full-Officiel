import React from 'react';
import type { Template } from '~/types/template';
import { STARTER_TEMPLATES } from '~/utils/constants';

interface FrameworkLinkProps {
  template: Template;
}

const FrameworkLink: React.FC<FrameworkLinkProps> = ({ template }) => (
  <a
    href={`/git?url=https://github.com/${template.githubRepo}.git`}
    data-state="closed"
    data-discover="true"
    className="group relative flex items-center justify-center p-4 rounded-xl bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-all duration-300"
  >
    <div
      className={`${template.icon} w-12 h-12 text-4xl transition-all duration-300 opacity-80 group-hover:opacity-100 group-hover:text-green-500 dark:text-white dark:opacity-80 dark:group-hover:opacity-100 dark:group-hover:text-green-400`}
      title={template.label}
    />
    <span className="absolute bottom-1 text-xs text-bolt-elements-textTertiary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      {template.label}
    </span>
  </a>
);

const StarterTemplates: React.FC = () => {
  // Debug: Log available templates and their icons
  React.useEffect(() => {
    console.log(
      'Available templates:',
      STARTER_TEMPLATES.map((t) => ({ name: t.name, icon: t.icon })),
    );
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <h3 className="text-xl font-medium text-bolt-elements-textPrimary">
        Choisissez votre stack de démarrage
      </h3>
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {STARTER_TEMPLATES.map((template) => (
            <FrameworkLink key={template.name} template={template} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StarterTemplates;
