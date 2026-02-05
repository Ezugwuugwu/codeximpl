"""
Randomized hospital billing simulation with periodic error injection.

Defaults:
- Outputs to console and a CSV file.
+- Injects error instructions every 30 simulated seconds.
+- Runs for a finite simulated duration (default 10 minutes).
"""

from __future__ import annotations

import csv
import random
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional


# ----------------------------
# Configuration (edit as needed)
# ----------------------------

# Simulation timing
SIM_DURATION_SECONDS = 10 * 60  # 10 minutes of simulated time
SIM_STEP_SECONDS = 1  # each loop advances simulated clock by 1 second
ERROR_INSTRUCTION_INTERVAL = 30  # inject error instructions every 30 simulated seconds

# Speed: 1 simulated second = SIM_SECOND_REAL_SECONDS real seconds
# Example: 0.05 => 20x faster than real time
SIM_SECOND_REAL_SECONDS = 0.05

# Output
OUTPUT_CSV = Path("billing_simulation.csv")
PRINT_TO_CONSOLE = True

# Data sizes
LINES_PER_INVOICE = (1, 5)  # min/max line items per invoice
INVOICES_PER_STEP = (0, 2)  # min/max invoices created per simulated second


# ----------------------------
# Domain data
# ----------------------------

INSURANCE_PROVIDERS = [
    "Aetna",
    "BlueCross",
    "Cigna",
    "Humana",
    "Kaiser",
    "Labcorp",
    "Medicare",
    "Medicaid",
    "United",
]

DEPARTMENTS = [
    "Emergency",
    "Radiology",
    "Surgery",
    "Cardiology",
    "Orthopedics",
    "Oncology",
    "Pediatrics",
    "Neurology",
]

# Sample CPT-like codes (not real billing codes)
CPT_CODES = [
    "71020",
    "72148",
    "93000",
    "99284",
    "99285",
    "93010",
    "74177",
    "80053",
    "85025",
]

ERROR_INSTRUCTIONS = [
    "Inject invalid CPT code",
    "Set negative charge amount",
    "Omit patient_id",
    "Duplicate invoice_id",
    "Over-bill total by 15%",
    "Under-bill total by 10%",
]


# ----------------------------
# Models
# ----------------------------


@dataclass
class LineItem:
    cpt_code: str
    description: str
    units: int
    unit_charge: float

    @property
    def amount(self) -> float:
        return round(self.units * self.unit_charge, 2)


@dataclass
class Invoice:
    invoice_id: str
    patient_id: Optional[str]
    department: str
    insurer: str
    date_of_service: datetime
    line_items: List[LineItem]
    total: float
    error_instruction: Optional[str] = None


# ----------------------------
# Helpers
# ----------------------------


def random_patient_id() -> str:
    return f"P{random.randint(100000, 999999)}"


def random_invoice_id() -> str:
    return f"INV{random.randint(1000000, 9999999)}"


def random_line_item() -> LineItem:
    cpt = random.choice(CPT_CODES)
    units = random.randint(1, 3)
    unit_charge = round(random.uniform(50, 1200), 2)
    desc = f"Service {cpt}"
    return LineItem(cpt_code=cpt, description=desc, units=units, unit_charge=unit_charge)


def calc_total(items: List[LineItem]) -> float:
    return round(sum(li.amount for li in items), 2)


def apply_error(invoice: Invoice, instruction: str, recent_invoice_ids: List[str]) -> None:
    invoice.error_instruction = instruction

    if instruction == "Inject invalid CPT code":
        if invoice.line_items:
            invoice.line_items[0].cpt_code = "INVALID"
    elif instruction == "Set negative charge amount":
        if invoice.line_items:
            invoice.line_items[0].unit_charge = -abs(invoice.line_items[0].unit_charge)
    elif instruction == "Omit patient_id":
        invoice.patient_id = None
    elif instruction == "Duplicate invoice_id":
        if recent_invoice_ids:
            invoice.invoice_id = random.choice(recent_invoice_ids)
    elif instruction == "Over-bill total by 15%":
        invoice.total = round(invoice.total * 1.15, 2)
    elif instruction == "Under-bill total by 10%":
        invoice.total = round(invoice.total * 0.90, 2)


def invoice_to_row(invoice: Invoice) -> dict:
    return {
        "invoice_id": invoice.invoice_id,
        "patient_id": invoice.patient_id or "",
        "department": invoice.department,
        "insurer": invoice.insurer,
        "date_of_service": invoice.date_of_service.isoformat(),
        "line_items": "|".join(
            f"{li.cpt_code}:{li.units}:{li.unit_charge:.2f}:{li.amount:.2f}" for li in invoice.line_items
        ),
        "total": f"{invoice.total:.2f}",
        "error_instruction": invoice.error_instruction or "",
    }


def print_invoice(invoice: Invoice) -> None:
    if not PRINT_TO_CONSOLE:
        return
    print(
        f"[{invoice.date_of_service.isoformat()}] {invoice.invoice_id} "
        f"patient={invoice.patient_id or 'MISSING'} dept={invoice.department} "
        f"insurer={invoice.insurer} total=${invoice.total:.2f} "
        f"error={invoice.error_instruction or 'none'}"
    )


# ----------------------------
# Simulation
# ----------------------------


def run_simulation() -> None:
    simulated_start = datetime.now()
    simulated_now = simulated_start
    simulated_end = simulated_start + timedelta(seconds=SIM_DURATION_SECONDS)

    # Track recent invoice IDs for duplication errors
    recent_invoice_ids: List[str] = []
    recent_limit = 200

    # CSV setup
    write_header = not OUTPUT_CSV.exists()
    with OUTPUT_CSV.open("a", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "invoice_id",
                "patient_id",
                "department",
                "insurer",
                "date_of_service",
                "line_items",
                "total",
                "error_instruction",
            ],
        )
        if write_header:
            writer.writeheader()

        next_error_time = simulated_start + timedelta(seconds=ERROR_INSTRUCTION_INTERVAL)

        while simulated_now <= simulated_end:
            # Determine if we should inject an error instruction this step
            instruction: Optional[str] = None
            if simulated_now >= next_error_time:
                instruction = random.choice(ERROR_INSTRUCTIONS)
                next_error_time += timedelta(seconds=ERROR_INSTRUCTION_INTERVAL)

            # Generate invoices for this step
            for _ in range(random.randint(*INVOICES_PER_STEP)):
                items = [random_line_item() for _ in range(random.randint(*LINES_PER_INVOICE))]
                invoice = Invoice(
                    invoice_id=random_invoice_id(),
                    patient_id=random_patient_id(),
                    department=random.choice(DEPARTMENTS),
                    insurer=random.choice(INSURANCE_PROVIDERS),
                    date_of_service=simulated_now,
                    line_items=items,
                    total=calc_total(items),
                )

                if instruction:
                    apply_error(invoice, instruction, recent_invoice_ids)

                recent_invoice_ids.append(invoice.invoice_id)
                if len(recent_invoice_ids) > recent_limit:
                    recent_invoice_ids.pop(0)

                print_invoice(invoice)
                writer.writerow(invoice_to_row(invoice))

            simulated_now += timedelta(seconds=SIM_STEP_SECONDS)
            time.sleep(SIM_SECOND_REAL_SECONDS * SIM_STEP_SECONDS)


if __name__ == "__main__":
    run_simulation()
