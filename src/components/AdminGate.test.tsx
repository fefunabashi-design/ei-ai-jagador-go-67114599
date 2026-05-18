import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminGate } from "./AdminGate";

// Mock navigation
const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock BottomNav (avoids router/data deps)
vi.mock("@/components/BottomNav", () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

// Mock supabase client
const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
  },
}));

// Mock useAdminAccess — value set per test
const accessState = {
  loading: false,
  hasAccess: false,
  status: "none" as "none" | "trialing" | "active" | "expired",
  expiresAt: null as Date | null,
  daysLeft: 0,
  isSuperAdmin: false,
  refresh: vi.fn(),
};
vi.mock("@/hooks/useAdminAccess", () => ({
  useAdminAccess: () => accessState,
}));

const renderGate = () =>
  render(
    <MemoryRouter>
      <AdminGate>
        <div data-testid="protected">conteudo admin</div>
      </AdminGate>
    </MemoryRouter>
  );

beforeEach(() => {
  navigateMock.mockReset();
  invokeMock.mockReset();
  accessState.refresh.mockReset();
  Object.assign(accessState, {
    loading: false,
    hasAccess: false,
    status: "none",
    expiresAt: null,
    daysLeft: 0,
    isSuperAdmin: false,
  });
});

describe("AdminGate (status: none)", () => {
  it("mostra o aviso inicial e bloqueia acesso ao conteúdo protegido", () => {
    renderGate();
    expect(screen.getByText("Atenção")).toBeInTheDocument();
    expect(
      screen.getByText(/destinado a quem/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it('avança para a tela do plano ao clicar em "Quero administrar um time"', () => {
    renderGate();
    fireEvent.click(screen.getByRole("button", { name: /quero administrar um time/i }));
    expect(screen.getByText("Admin PRO")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$ 29,90/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /começar 30 dias grátis/i })
    ).toBeInTheDocument();
  });

  it('navega para /dashboard ao escolher "Sou apenas jogador" no aviso', () => {
    renderGate();
    fireEvent.click(screen.getByRole("button", { name: /sou apenas jogador/i }));
    expect(navigateMock).toHaveBeenCalledWith("/dashboard");
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it('navega para /dashboard ao escolher "ficar somente como jogador" na tela do plano', () => {
    renderGate();
    fireEvent.click(screen.getByRole("button", { name: /quero administrar um time/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /ficar somente como jogador/i })
    );
    expect(navigateMock).toHaveBeenCalledWith("/dashboard");
  });

  it("inicia o trial e chama refresh ao clicar em começar 7 dias grátis", async () => {
    invokeMock.mockResolvedValue({ error: null });
    renderGate();
    fireEvent.click(screen.getByRole("button", { name: /quero administrar um time/i }));
    fireEvent.click(screen.getByRole("button", { name: /começar 7 dias grátis/i }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("start-trial"));
    await waitFor(() => expect(accessState.refresh).toHaveBeenCalled());
  });
});

describe("AdminGate (sem acesso)", () => {
  it("mostra tela de expirado quando status é expired e bloqueia conteúdo", () => {
    Object.assign(accessState, { status: "expired", hasAccess: false });
    renderGate();
    expect(screen.getByText(/acesso expirado/i)).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("redireciona para /assinatura ao clicar em pagar mensalidade", () => {
    Object.assign(accessState, { status: "expired", hasAccess: false });
    renderGate();
    fireEvent.click(screen.getByRole("button", { name: /pagar mensalidade/i }));
    expect(navigateMock).toHaveBeenCalledWith("/assinatura");
  });
});

describe("AdminGate (com acesso)", () => {
  it("renderiza o conteúdo protegido quando status é active", () => {
    Object.assign(accessState, { status: "active", hasAccess: true });
    renderGate();
    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });

  it("renderiza o conteúdo + banner de trial quando status é trialing", () => {
    Object.assign(accessState, {
      status: "trialing",
      hasAccess: true,
      daysLeft: 12,
    });
    renderGate();
    expect(screen.getByTestId("protected")).toBeInTheDocument();
    expect(screen.getByText(/faltam 12 dias/i)).toBeInTheDocument();
  });
});
