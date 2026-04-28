"""CRUD operations for Category."""

from sqlalchemy.orm import Session

from models import Category
from schemas import CategoryCreate


def get_categories(db: Session, account_id: int) -> list[Category]:
    return (
        db.query(Category)
        .filter(Category.account_id == account_id)
        .order_by(Category.name)
        .all()
    )


def create_category(db: Session, account_id: int, data: CategoryCreate) -> Category:
    category = Category(account_id=account_id, name=data.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session, category_id: int, data: CategoryCreate
) -> Category | None:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return None
    category.name = data.name
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> bool:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return False
    db.delete(category)
    db.commit()
    return True
