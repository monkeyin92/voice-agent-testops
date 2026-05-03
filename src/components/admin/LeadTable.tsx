import type { Lead } from "@/domain/lead";

export function LeadTable({ leads }: { leads: Lead[] }) {
  return (
    <table className="lead-table">
      <thead>
        <tr>
          <th>客户</th>
          <th>电话</th>
          <th>需求</th>
          <th>意向</th>
          <th>下一步</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => (
          <tr key={lead.id}>
            <td>{lead.customerName ?? "未留姓名"}</td>
            <td>{lead.phone ?? "未留电话"}</td>
            <td>{lead.need}</td>
            <td>{lead.level}</td>
            <td>{lead.nextAction}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
