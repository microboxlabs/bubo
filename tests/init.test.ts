import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { parseGitHubRemoteUrl, detectGitHubRemote } from '../src/cli/commands/init.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

describe('parseGitHubRemoteUrl', () => {
  describe('SSH URLs', () => {
    it('parses standard SSH URL', () => {
      const result = parseGitHubRemoteUrl('git@github.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses SSH URL without .git suffix', () => {
      const result = parseGitHubRemoteUrl('git@github.com:owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses SSH URL with hyphens in owner and repo', () => {
      const result = parseGitHubRemoteUrl('git@github.com:my-org/my-repo.git');
      expect(result).toEqual({ owner: 'my-org', repo: 'my-repo' });
    });

    it('parses SSH URL with underscores', () => {
      const result = parseGitHubRemoteUrl('git@github.com:my_org/my_repo.git');
      expect(result).toEqual({ owner: 'my_org', repo: 'my_repo' });
    });
  });

  describe('HTTPS URLs', () => {
    it('parses standard HTTPS URL', () => {
      const result = parseGitHubRemoteUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses HTTPS URL without .git suffix', () => {
      const result = parseGitHubRemoteUrl('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses HTTPS URL with port', () => {
      const result = parseGitHubRemoteUrl('https://github.com:443/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses HTTPS URL with non-standard port', () => {
      const result = parseGitHubRemoteUrl('https://github.com:8443/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses HTTPS URL with port but without .git suffix', () => {
      const result = parseGitHubRemoteUrl('https://github.com:443/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });
  });

  describe('repo names with dots', () => {
    it('parses repo name with dots', () => {
      const result = parseGitHubRemoteUrl('https://github.com/owner/repo.name.with.dots.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo.name.with.dots' });
    });

    it('parses repo name with dots and no .git suffix', () => {
      const result = parseGitHubRemoteUrl('https://github.com/owner/my.dotted.repo');
      expect(result).toEqual({ owner: 'owner', repo: 'my.dotted.repo' });
    });

    it('parses SSH URL with dotted repo name', () => {
      const result = parseGitHubRemoteUrl('git@github.com:owner/repo.v2.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo.v2' });
    });

    it('parses HTTPS URL with port and dotted repo name', () => {
      const result = parseGitHubRemoteUrl('https://github.com:443/owner/my.project.git');
      expect(result).toEqual({ owner: 'owner', repo: 'my.project' });
    });
  });

  describe('edge cases', () => {
    it('returns null for non-GitHub URLs', () => {
      const result = parseGitHubRemoteUrl('https://gitlab.com/owner/repo.git');
      expect(result).toBeNull();
    });

    it('returns null for malformed URLs', () => {
      const result = parseGitHubRemoteUrl('not-a-url');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = parseGitHubRemoteUrl('');
      expect(result).toBeNull();
    });

    it('returns null for URL with missing repo', () => {
      const result = parseGitHubRemoteUrl('https://github.com/owner');
      expect(result).toBeNull();
    });

    it('handles numeric repo names', () => {
      const result = parseGitHubRemoteUrl('https://github.com/owner/12345.git');
      expect(result).toEqual({ owner: 'owner', repo: '12345' });
    });
  });
});

describe('detectGitHubRemote', () => {
  const mockExecFileSync = vi.mocked(execFileSync);

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset GIT_PATH env var
    delete process.env['GIT_PATH'];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('detects GitHub remote from SSH URL', () => {
    mockExecFileSync.mockReturnValue('git@github.com:microboxlabs/bubo.git\n');

    const result = detectGitHubRemote();

    expect(result).toEqual({ owner: 'microboxlabs', repo: 'bubo' });
    expect(mockExecFileSync).toHaveBeenCalledWith('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  });

  it('detects GitHub remote from HTTPS URL', () => {
    mockExecFileSync.mockReturnValue('https://github.com/microboxlabs/bubo.git\n');

    const result = detectGitHubRemote();

    expect(result).toEqual({ owner: 'microboxlabs', repo: 'bubo' });
  });

  it('detects GitHub remote from HTTPS URL with port', () => {
    mockExecFileSync.mockReturnValue('https://github.com:443/microboxlabs/bubo.git\n');

    const result = detectGitHubRemote();

    expect(result).toEqual({ owner: 'microboxlabs', repo: 'bubo' });
  });

  it('returns null when git command fails', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('fatal: not a git repository');
    });

    const result = detectGitHubRemote();

    expect(result).toBeNull();
  });

  it('returns null when remote is not a GitHub URL', () => {
    mockExecFileSync.mockReturnValue('https://gitlab.com/owner/repo.git\n');

    const result = detectGitHubRemote();

    expect(result).toBeNull();
  });

  it('uses custom GIT_PATH when set', () => {
    process.env['GIT_PATH'] = '/custom/path/to/git';
    mockExecFileSync.mockReturnValue('git@github.com:owner/repo.git\n');

    detectGitHubRemote();

    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/custom/path/to/git',
      ['remote', 'get-url', 'origin'],
      expect.any(Object)
    );
  });
});
